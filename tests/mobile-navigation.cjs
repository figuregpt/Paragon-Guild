const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3190';
assert.equal(new URL(base).hostname, '127.0.0.1', 'Only use an isolated local instance');
const dictionary = JSON.parse(readFileSync(path.join(__dirname, '../lib/translations.json'), 'utf8'));
const {recipes} = require('../lib/guide-dews.json');
const {categories:equipmentTypes} = require('../lib/guide-upgrades.json');
const categories = [['guild', 'Guild', 'home'], ['guide', 'Guide', 'guide'], ['recipes', 'Recipes', 'recipes'], ['tools', 'Tools', 'tools']];
const navSelector = '.pg-category-nav';
const guildPages = ['home', 'events', 'auctions', 'members', 'profile'];

async function signIn(context) {
  const status = await (await context.request.get(base + '/api/status')).json();
  const route = status.demoReady ? 'demo-login' : 'preview-login';
  const login = await context.request.post(base + '/api/' + route, {headers:{Origin:base}, data:{role:'member'}});
  assert.ok(login.ok(), 'Local test sign-in failed (' + login.status() + ')');
}

async function assertCategory(page, category) {
  const nav = page.locator(navSelector);
  await nav.locator('[data-category="' + category + '"][aria-current="page"]').waitFor();
  assert.equal(await nav.locator('[aria-current="page"]').count(), 1, 'One active primary category');
}

async function open(page, route) {
  const response = await page.goto(base + route);
  assert.ok(response?.ok(), route + ' returned HTTP ' + response?.status());
}

async function checkFullWidth(page) {
  const width = await page.evaluate(() => document.documentElement.clientWidth);
  for (const selector of ['.pg-masthead', '.pg-category-shell', 'footer']) {
    const box = await page.locator(selector).boundingBox();
    assert.ok(box && Math.abs(box.x) <= 1 && Math.abs(box.x + box.width - width) <= 1,
      selector + ' should span the ' + width + 'px viewport');
  }
}

async function checkHome(page, language, screenshotPath) {
  await page.locator('.pg-home').waitFor();
  const content = page.locator('main');
  assert.equal(await content.locator('.pg-quest-confirm').count(), 0);
  for (const label of ['I Have Given the Yang', 'Confirm Yang Transfer', 'Transfer Submitted', 'Transfer submitted for administrator approval.']) {
    const translated = language === 'en' ? label : dictionary[label]?.[language];
    if (translated) assert.equal(await content.getByText(translated, {exact:true}).count(), 0, translated);
  }
  assert.doesNotMatch(await page.locator('.pg-pp-meme').innerText(), /01:00/);
  const brokenWords = await content.locator('.pg-event-reward > span').evaluateAll(statuses => {
    const broken = [];
    for (const status of statuses) {
      const text = status.firstChild;
      for (const match of text.textContent.matchAll(/\S+/g)) {
        const range = document.createRange();
        range.setStart(text, match.index);
        range.setEnd(text, match.index + match[0].length);
        if (range.getClientRects().length > 1) broken.push(match[0]);
      }
    }
    return broken;
  });
  assert.deepEqual(brokenWords, [], 'Event status words fit their column');
  if (screenshotPath) {
    await page.evaluate(async () => {
      scrollTo(0, 0);
      await document.fonts.ready;
      await Promise.all([...document.images].filter(image => image.complete).map(image => image.decode()));
    });
    await page.screenshot({path:screenshotPath});
  }
}

async function checkMobileBounds(page, width, height) {
  const nav = page.locator(navSelector);
  const bounds = await nav.boundingBox();
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
  assert.ok(Math.abs(height - bounds.y - bounds.height) < 1, 'Navigation stays at the bottom');
  for (const link of await nav.getByRole('link').all()) {
    const box = await link.boundingBox();
    assert.ok(box.width >= 44 && box.height >= 44, 'Touchable category target');
    assert.ok(box.x >= bounds.x && box.x + box.width <= bounds.x + bounds.width + 1);
    assert.ok(await link.evaluate(el => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1), 'Category label fits');
  }
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Page fits viewport');
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  const help = await page.locator('footer a[href="/how-to-use"]').boundingBox();
  assert.ok(help && help.y + help.height <= bounds.y + 1, 'Footer remains accessible above bottom navigation');
}

async function checkSafeInsets(page) {
  const css = ['app/category-navigation.css','app/paragon.css'].map(file => readFileSync(path.join(__dirname, '..', file), 'utf8')).join('\n');
  const insets = {top:62, bottom:34, left:20, right:20};
  const override = css.replace(/env\(\s*safe-area-inset-(top|bottom|left|right)\s*(?:,[^)]*)?\)/g, (_, edge) => insets[edge] + 'px');
  const sheet = await page.addStyleTag({content:override});
  try {
    const geometry = await page.locator(navSelector).getByRole('link').evaluateAll(links => {
      const rects = links.map(link => link.getBoundingClientRect());
      return {left:rects[0].left, right:innerWidth - rects.at(-1).right, bottom:innerHeight - rects[0].bottom};
    });
    await page.evaluate(() => scrollTo(0, 0));
    const header = page.locator('.pg-masthead');
    assert.equal(await page.locator('meta[name="apple-mobile-web-app-status-bar-style"]').getAttribute('content'), 'black');
    assert.ok(await header.evaluate(el => getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)'), 'Opaque header');
    for (const control of await header.locator('img, select, button').all()) {
      const box = await control.boundingBox();
      assert.ok(box && box.y >= insets.top + 8, 'Header content clears the status bar and its regular padding');
    }
    assert.ok(geometry.left >= insets.left && geometry.right >= insets.right && geometry.bottom >= insets.bottom, 'All tabs clear safe areas');
  } finally { await sheet.evaluate(el => el.remove()); }
}

async function checkDeepLinks(page, mobile) {
  await page.locator(navSelector).locator('[data-category="guild"]').click();
  await page.getByRole('link', {name:'View PP History',exact:true}).click();
  await page.waitForURL(url => url.searchParams.get('view') === 'profile' && url.hash === '#pp-history');
  await page.locator('#pp-history').waitFor();
  await page.waitForFunction(() => {
    const target = document.querySelector('#pp-history').getBoundingClientRect();
    return target.top >= -1 && target.top < innerHeight;
  });
  await page.goBack();
  await page.locator('.pg-home').waitFor();

  await open(page, '/?view=guide&guide=upgrades&category=earrings&q=15');
  await assertCategory(page, 'recipes');
  assert.equal(await page.locator('select[name="upgradeCategory"]').inputValue(), 'earrings');
  assert.equal(await page.locator('input[name="upgradeSearch"]').inputValue(), '15');
  await page.getByRole('heading', {name:'Silver Earrings',exact:true}).waitFor();

  for (const [route, category, content] of [
    ['view=guide&guide=dews','recipes','.gd-guide'],
    ['view=guide&boss=thornspike-stump','guide','.gb-boss-detail'],
    ['view=tools&boss=thornspike-stump#tracker-channel-3','tools','.bt-tracker'],
    ['view=members&section=groups','guild','.pg-guild-pages'],
  ]) {
    if (category === 'tools') {
      const now = Math.floor(Date.now() / 1000);
      await page.route('**/api/boss-timers', request => request.fulfill({json:{
        serverTime: now, pushReady:false, subscribed:false,
        timers: [{boss_id:'thornspike-stump',game_channel:3,killed:now,respawns:now+2400,revision:'fixture'}],
      }}));
    }
    await open(page, '/?' + route);
    await assertCategory(page, category);
    await page.locator(content).waitFor();
    if (category === 'tools') {
      assert.equal(await page.locator('select[name="trackerBoss"]').inputValue(), 'thornspike-stump');
      assert.deepEqual(await page.locator('.bt-channel-head strong').allTextContents(), ['CH1','CH2','CH3','CH4','CH5','CH6']);
      await page.locator('.bt-running #tracker-channel-3:focus').waitFor();
      assert.equal(await page.getByRole('heading',{name:'Active channels',exact:true}).count(), 0);
      await page.unroute('**/api/boss-timers');
    }
  }
  await page.locator(navSelector).locator('[data-category="recipes"]').click();
  await assertCategory(page, 'recipes');
  await page.goBack();
  await assertCategory(page, 'guild');
  assert.equal(new URL(page.url()).searchParams.get('section'), 'groups', 'History restores guild subsection');
  await page.goForward();
  await assertCategory(page, 'recipes');

  const directory = page.locator('.gr-directory');
  const dews = directory.locator('a[href="/?view=recipes&guide=dews"]');
  const upgrades = directory.locator('a[href="/?view=recipes&guide=upgrades"]');
  await directory.waitFor();
  assert.equal(await directory.getByRole('link').count(), 2);
  if (mobile) await dews.tap(); else await dews.press('Enter');
  await page.locator('.gd-recipes').waitFor();
  assert.deepEqual(await page.locator('.gd-recipes [data-recipe]').evaluateAll(rows => rows.map(row => row.dataset.recipe)), recipes.map(recipe => recipe.id));
  await page.goBack();
  if (mobile) await upgrades.tap(); else await upgrades.press('Enter');
  const equipment = page.locator('select[name="upgradeCategory"]');
  await equipment.waitFor();
  assert.deepEqual(await equipment.locator('option').evaluateAll(options => options.map(option => option.value)), equipmentTypes.map(type => type.id));
  await equipment.selectOption('shields');
  await page.waitForURL(url => url.searchParams.get('category') === 'shields');
  await page.getByRole('button', {name:'Recipes', exact:true}).click();
  await directory.waitFor();
  await open(page, '/?view=recipes&guide=dews&recipe=red-dew');
  await page.locator('.gr-focused-recipe [data-recipe="red-dew"]').waitFor();

  await page.locator(navSelector).locator('[data-category="guild"]').click();
  for (const view of guildPages) {
    await page.locator('.pg-guild-pages a[href="/?view=' + view + '"]').click();
    await page.waitForURL(url => (url.searchParams.get('view') || 'home') === view);
    await assertCategory(page, 'guild');
    assert.equal(await page.locator('.pg-guild-pages a[aria-current="page"]').count(), 1);
    assert.equal(new URL(await page.locator('.pg-guild-pages a[aria-current="page"]').getAttribute('href'), base).searchParams.get('view'), view);
  }
  const eventsLink = page.locator('.pg-guild-pages').getByRole('link', {name:'Events',exact:true});
  const sections = page.getByRole('group', {name:'Event sections'});
  const active = name => sections.getByRole('button', {name,exact:true,pressed:true});
  await eventsLink.click();
  await sections.getByRole('button', {name:'History',exact:true}).click();
  await active('History').waitFor();
  await eventsLink.click();
  await active('Schedule').waitFor();
  assert.equal(new URL(page.url()).searchParams.get('section'), null);
  await page.goBack();
  await active('History').waitFor();
  assert.equal(new URL(page.url()).searchParams.get('section'), 'history');
  await page.goForward();
  await active('Schedule').waitFor();
}

(async () => {
  const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH});
  try {
    for (const width of [320,390,430,700,701,768,1440,1885,2560]) for (const language of ['en','tr','el']) {
      const mobile = width <= 700, height = mobile ? 844 : width === 1885 ? 950 : 1000;
      const context = await browser.newContext({viewport:{width,height}, isMobile:mobile, hasTouch:mobile, locale:'en-US'});
      try {
        await signIn(context);
        const page = await context.newPage(), errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await open(page, '/?view=home');
        await assertCategory(page,'guild');
        assert.match(await page.locator('meta[name=viewport]').getAttribute('content'), /viewport-fit=cover/);
        await page.locator('select[name=language]').selectOption(language);
        await page.waitForFunction(lang => document.documentElement.lang === lang, language);
        const nav = page.locator(navSelector);
        assert.equal(await nav.getByRole('link').count(), 4);
        for (const [key, label, view] of categories) {
          const translated = language === 'en' ? label : dictionary[label][language];
          const link = nav.getByRole('link', {name:translated,exact:true});
          assert.equal(await link.getAttribute('data-category'), key);
          if (mobile) await link.tap(); else await link.click();
          await page.waitForURL(url => (url.searchParams.get('view') || 'home') === view);
          await assertCategory(page,key);
          if (width >= 1885) await checkFullWidth(page);
          if (width >= 1885 && key === 'recipes') {
            const footer = await page.locator('footer').boundingBox();
            assert.ok(footer.y + footer.height >= height - 1, 'Short pages fill the viewport height');
          }
          if (key === 'guild') {
            const screenshot = width === 390 ? process.env.HOME_MOBILE_SCREENSHOT_PATH : width === 1885 ? process.env.HOME_WIDE_SCREENSHOT_PATH : undefined;
            await checkHome(page, language, language === 'tr' ? screenshot : undefined);
          }
          if (key === 'recipes' && width === 390 && language === 'tr' && process.env.RECIPES_SCREENSHOT_PATH) {
            await page.locator('.gr-directory').waitFor();
            await page.evaluate(async () => {
              scrollTo(0, 0);
              await document.fonts.ready;
            });
            await page.screenshot({path:process.env.RECIPES_SCREENSHOT_PATH});
          }
          if (mobile) await checkMobileBounds(page,width,height);
          else {
            const rail = await nav.boundingBox(), content = await page.locator('main').boundingBox();
            assert.ok(rail.x + rail.width <= content.x + 1, 'Desktop menu is to the left of the content');
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), width + 'px ' + language + ' ' + key + ' page fits viewport');
          }
        }
        if (mobile && width === 320) await checkSafeInsets(page);
        if (language === 'en' && (width === 320 || width === 1440)) await checkDeepLinks(page,mobile);
        const last = nav.getByRole('link').last();
        await last.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
        assert.ok(await last.evaluate(el => el === document.activeElement && el.matches(':focus-visible')), 'Keyboard focus survives tab navigation');
        assert.deepEqual(errors, []);
        console.log('PASS ' + language + ' ' + width + 'px: category links, selected route and navigation layout');
      } finally { await context.close(); }
    }
    const anonymous = await browser.newContext();
    try {
      const page = await anonymous.newPage();
      await open(page, '/'); await page.locator('.pg-login').waitFor();
      assert.equal(await page.locator(navSelector).count(), 0);
    } finally { await anonymous.close(); }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
