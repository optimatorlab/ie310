# Install MySQL directly on your computer (fallback)

Use this only if you cannot run Docker. It has more steps and differs by operating system.

Install **MySQL Community Server 8.4 LTS** (any 8.x/9.x is fine). The rest of this guide creates the `student` login and loads the databases.

## 1. Install the server

### Windows
1. Download the **MySQL Installer** from <https://dev.mysql.com/downloads/installer/> (the larger "web community" or full installer, either works). No account is needed: click "No thanks, just start my download".
2. Choose **Custom**, and select only **MySQL Server 8.4** and **MySQL Shell** (optional).
3. Keep the defaults: port **3306**, "Standalone MySQL Server", and the **strong password encryption** (`caching_sha2_password`) authentication method.
4. Set a **root password** you will remember (for this guide we'll write it as `YOUR_ROOT_PASSWORD`).
5. Let it run MySQL as a Windows service that starts automatically.

### macOS
Install [Homebrew](https://brew.sh) if you don't have it, then:
```
brew install mysql
brew services start mysql
```
Root has no password at first, so connect with `mysql -u root`. (Prefer an installer? Use the `.dmg` from <https://dev.mysql.com/downloads/mysql/> and follow its prompts to set a root password.)

### Ubuntu / Debian
```
sudo apt update
sudo apt install mysql-server
sudo systemctl enable --now mysql
```
On Ubuntu, connect as root with `sudo mysql` (no password; it uses your system login).

## 2. Open a MySQL prompt as root

| OS | Command |
|---|---|
| Windows | Start menu → **MySQL 8.4 Command Line Client** → enter your root password |
| macOS (Homebrew) | `mysql -u root` |
| Ubuntu | `sudo mysql` |

You will see a `mysql>` prompt.

## 3. Create the login and load Class 1 data

At the `mysql>` prompt, type `source ` followed by the **full path** to each file (use forward slashes `/`, even on Windows; no quotes needed if the path has no spaces):

```
source /full/path/to/mySQL/sql/00_users.sql
source /full/path/to/mySQL/sql/school_toy.sql
```

Windows example: `source C:/Users/me/ie310/mySQL/sql/00_users.sql`

Test the new login from a normal terminal (not inside MySQL):

```
mysql -u student -pstudent school -e "SHOW TABLES;"
```

You should see `courses`, `enrollments`, and `students`. (On Windows, if `mysql` is not found, use the Command Line Client and run `connect school;`, or add `C:\Program Files\MySQL\MySQL Server 8.4\bin` to your PATH.)

## 4. Class 2: load the Citi Bike database

1. Download `citibike.sql.gz` from UBLearns into the `mySQL/data` folder.
2. Unzip it with Python (works on every OS; run in the `mySQL` folder):
   ```
   python -c "import gzip, shutil; shutil.copyfileobj(gzip.open('data/citibike.sql.gz'), open('data/citibike.sql', 'wb'))"
   ```
3. At the root `mysql>` prompt:
   ```
   source /full/path/to/mySQL/data/citibike.sql
   ```
   This takes 1 to 3 minutes.
4. Check it: `mysql -u student -pstudent citibike -e "SELECT COUNT(*) FROM rides;"` should print 1219444.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `ERROR 1045 Access denied` | Wrong password. Root's password is the one you set during install. |
| `Can't connect to MySQL server on '127.0.0.1'` | The server isn't running. Windows: Services → MySQL84 → Start. macOS: `brew services start mysql`. Ubuntu: `sudo systemctl start mysql`. |
| Port 3306 already in use | Another MySQL is running. Stop it, or install on a different port and set `IE310_DB_URL` (see `RUNNING_NOTEBOOKS.md`). |
| `RSA public key is not available` / `cryptography package is required` in Python | Run `pip install cryptography`. |
| `source` can't find the file | Use the full path, forward slashes, and no stray spaces. |
