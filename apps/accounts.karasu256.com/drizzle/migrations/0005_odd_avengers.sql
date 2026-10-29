CREATE TABLE "firebase_user" (
	"user_id" varchar(128) PRIMARY KEY NOT NULL,
	"firebase_uid" varchar(128),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "firebase_user_firebase_uid_unique" UNIQUE("firebase_uid")
);
--> statement-breakpoint
ALTER TABLE "firebase_user" ADD CONSTRAINT "firebase_user_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Every pre-existing user id IS its Firebase UID (the old create hook adopted
-- it), so seed the link table with identity mappings to preserve those links.
INSERT INTO "firebase_user" ("user_id", "firebase_uid") SELECT "id", "id" FROM "users" ON CONFLICT DO NOTHING;
