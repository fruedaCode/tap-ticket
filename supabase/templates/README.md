# Supabase Auth email templates

Branded, localized email templates for Supabase Auth. The app signs users in
with a magic link (`signInWithOtp` in `app/login/page.tsx`), so only the
**Magic Link** template is in use today.

## How localization works

Supabase has a single template per project, so the language cannot be switched
per request. Instead, the app stores the user's language in
`auth.users.user_metadata.locale` (`es` / `en` / `ca`):

- `app/login/page.tsx` passes `data: { locale: lang }` to `signInWithOtp`
  (applied when the user is created).
- `lib/i18n/index.tsx` keeps the metadata in sync whenever a signed-in user's
  app language changes.

The template branches on it with Go template conditionals
(`{{ if eq .Data.locale "ca" }}...{{ end }}`). Users without a stored locale
get the default language: **Spanish**.

## Applying the template (hosted Supabase)

The hosted project does not read templates from this repo — paste them in the
dashboard:

1. Open **Authentication → Emails** (a.k.a. **Email Templates**) in the
   Supabase dashboard.
2. Select the **Magic Link** template.
3. Set the subject to:

   ```
   {{ $locale := index .Data "locale" }}{{ if eq $locale "ca" }}El teu enllaç d'accés a tapticket{{ else if eq $locale "en" }}Your tapticket sign-in link{{ else }}Tu enlace de acceso a tapticket{{ end }}
   ```

4. Replace the body with the contents of `magic-link.html` and save.
5. Send yourself a magic link to verify the rendering in a real inbox.

## Local development

If you ever run Supabase locally with the CLI, point `supabase/config.toml` at
the file instead:

```toml
[auth.email.template.magic_link]
subject = "..."
content_path = "./supabase/templates/magic-link.html"
```
