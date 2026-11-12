# MySQL Tutorial (IE 310)

Two classes on relational databases and SQL, for students who already know pandas.

| Class | Notebook | Database | What you do |
|---|---|---|---|
| 1 | `01_relational_fundamentals.ipynb` | `school` (12 students, 6 courses, 35 enrollments) | Learn relational concepts and basic SQL, side by side with pandas |
| 2 | `02_citibike_queries.ipynb` | `citibike` (1.2 million Feb 2026 rides) | Aggregations, joins, CTEs, window functions, and indexes on real data |

## Set up 

1. **Install MySQL.** Pick **one** route:
   * [`INSTALL_docker.md`](INSTALL_docker.md): **recommended.** Same steps on Windows, Mac, and Linux.
   * [`INSTALL_local.md`](INSTALL_local.md): use this if Docker will not run on your computer.
2. **Set up Python and Jupyter**: [`RUNNING_NOTEBOOKS.md`](RUNNING_NOTEBOOKS.md).
3. Open `01_relational_fundamentals.ipynb` and run the connection cells. If `SHOW TABLES` lists `courses`, `enrollments`, and `students`, you're ready.

## Login used throughout

| Setting | Value |
|---|---|
| Host | `127.0.0.1` |
| Port | `3306` |
| User | `student` |
| Password | `student` |
| Databases | `school`, `citibike` |

These are throwaway credentials for a database that only your own computer can reach. Never reuse them for anything real.

## Files

```
mySQL/
  docker-compose.yml            Docker setup (auto-loads the school database)
  sql/00_users.sql              creates the `student` login
  sql/school_toy.sql            the Class 1 toy database
  data/                         put citibike.sql.gz here for Class 2 (not in git)
  01_relational_fundamentals.ipynb
  02_citibike_queries.ipynb
```
