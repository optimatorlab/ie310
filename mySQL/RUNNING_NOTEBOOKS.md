# Run the notebooks

You need Python 3.10+ and Jupyter. If you already use Jupyter for the pandas notebooks in this course, skip to step 3.

## 1. Create a virtual environment (once)

In a terminal, in the folder where you keep course files:

**macOS / Linux**
```
python3 -m venv venv
source venv/bin/activate
```
**Windows (PowerShell)**
```
python -m venv venv
venv\Scripts\Activate.ps1
```
(If PowerShell refuses to run the script, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or use Command Prompt and `venv\Scripts\activate.bat`.)

## 2. Install the packages (once)

```
pip install jupyterlab pandas sqlalchemy pymysql cryptography jupysql
```

## 3. Start Jupyter

Make sure MySQL is running (see the install guide), then, in the `mySQL` folder with your environment activated:

```
jupyter lab
```

Open `01_relational_fundamentals.ipynb` and run the cells top to bottom (Shift+Enter).

(VS Code also works: open the notebook and pick the `venv` Python as the kernel.)

## Connection settings

The notebooks connect with `mysql+pymysql://student:student@127.0.0.1:3306/school`. To use a different port or login, set the environment variable `IE310_DB_URL` **before** starting Jupyter:

* macOS / Linux: `export IE310_DB_URL="mysql+pymysql://student:student@127.0.0.1:3307/school"`
* Windows PowerShell: `$env:IE310_DB_URL = "mysql+pymysql://student:student@127.0.0.1:3307/school"`

## Troubleshooting

| Symptom | Fix |
|---|---|
| `OperationalError: (2003) Can't connect to MySQL server` | MySQL isn't running, or wrong port. Docker: `docker compose ps`. |
| `(1045) Access denied for user 'student'` | The `student` login wasn't created. Docker: `docker compose down -v` then `up -d`. Local: re-run `00_users.sql` as root. |
| `(1049) Unknown database 'school'` | `school_toy.sql` wasn't loaded. Same fix as above. |
| `ModuleNotFoundError` | Run the `pip install` line above in the **same** environment Jupyter uses. |
| `%sql` / `%%sql` not recognized | Run the `%load_ext sql` cell first. |
