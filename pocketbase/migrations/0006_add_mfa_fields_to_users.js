migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. mfa_enabled bool
    if (!usersCol.fields.getByName('mfa_enabled')) {
      usersCol.fields.add(new BoolField({ name: 'mfa_enabled' }))
    }

    // 2. mfa_secret text (encrypted in rest)
    if (!usersCol.fields.getByName('mfa_secret')) {
      usersCol.fields.add(new TextField({ name: 'mfa_secret', hidden: true }))
    }

    // 3. mfa_recovery_codes json (hashed codes array [{hash, used, used_at}])
    if (!usersCol.fields.getByName('mfa_recovery_codes')) {
      usersCol.fields.add(new JSONField({ name: 'mfa_recovery_codes', hidden: true }))
    }

    // 4. mfa_configured_at date
    if (!usersCol.fields.getByName('mfa_configured_at')) {
      usersCol.fields.add(new DateField({ name: 'mfa_configured_at' }))
    }

    // 5. mfa_temp_secret text (temporary secret during setup before first TOTP is verified)
    if (!usersCol.fields.getByName('mfa_temp_secret')) {
      usersCol.fields.add(new TextField({ name: 'mfa_temp_secret', hidden: true }))
    }

    // 6. mfa_temp_recovery_codes json (temporary recovery codes before setup confirmation)
    if (!usersCol.fields.getByName('mfa_temp_recovery_codes')) {
      usersCol.fields.add(new JSONField({ name: 'mfa_temp_recovery_codes', hidden: true }))
    }

    // 7. mfa_failed_attempts number
    if (!usersCol.fields.getByName('mfa_failed_attempts')) {
      usersCol.fields.add(new NumberField({ name: 'mfa_failed_attempts', onlyInt: true }))
    }

    // 8. mfa_locked_until date
    if (!usersCol.fields.getByName('mfa_locked_until')) {
      usersCol.fields.add(new DateField({ name: 'mfa_locked_until' }))
    }

    app.save(usersCol)
  },
  (app) => {
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      const fields = [
        'mfa_enabled',
        'mfa_secret',
        'mfa_recovery_codes',
        'mfa_configured_at',
        'mfa_temp_secret',
        'mfa_temp_recovery_codes',
        'mfa_failed_attempts',
        'mfa_locked_until',
      ]
      for (const f of fields) {
        if (usersCol.fields.getByName(f)) {
          usersCol.fields.removeByName(f)
        }
      }
      app.save(usersCol)
    } catch (_) {}
  },
)
