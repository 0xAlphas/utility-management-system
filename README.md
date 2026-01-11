## Getting Started

First, run the development server:

```bash
pnpm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Environment Setup

Create a `.env` file in the root directory and add your SQL Server credentials:

```
SQLSERVER_USER=your_username
SQLSERVER_PASSWORD=your_password
```

Make sure this file is not committed to version control.

### Database Setup (SSMS)

Restore the `utilitydb.bak` database using SQL Server Management Studio (SSMS):

- Open SSMS and connect to your SQL Server instance
- Right-click **Databases** → **Restore Database**
- Select **Device** → browse and choose `utilitydb.bak`
- Set the destination database name as `utilitydb`
- Click **OK** to restore

Ensure the restored database is running before starting the application.
