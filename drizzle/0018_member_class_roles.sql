ALTER TABLE members ADD class_roles TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(class_roles) AND json_type(class_roles)='array');
