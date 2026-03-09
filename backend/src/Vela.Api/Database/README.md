# Database Setup (Manual)

This project uses **manual SQL scripts** for database objects.
The backend does **not** create tables or stored procedures at runtime.

## Run order

1. `Tables/Users.sql`
2. `Tables/Favorites.sql`
3. `Tables/Recommendations.sql`
4. `Tables/StarPartyEvents.sql`
5. `SP/User SPs.sql`
6. `SP/Favorite SPs.sql`
7. `SP/Recommendation SPs.sql`
8. `SP/StarParty SPs.sql`

Run them against the database referenced by `ConnectionStrings:myProjDB`
in `backend/src/Vela.Api/appsettings.json`.

If your `Users` table already exists from an older version, rerun:
- `Tables/Users.sql`
- `SP/User SPs.sql`
to add profile columns and profile procedures.

## Notes

- DAL methods call stored procedures only.
- If you need an admin account:
1. Register a normal user through `POST /api/users/register`.
2. Promote it in SQL:

```sql
UPDATE Users
SET IsAdmin = 1, Role = 'admin'
WHERE Email = 'your-admin-email@example.com';
```
