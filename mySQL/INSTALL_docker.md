# Install MySQL with Docker (recommended)

Docker runs MySQL in an isolated "container" so everyone gets an identical setup. Nothing is installed into your system besides Docker itself, and you can wipe it completely with one command.

**Requirements:** about 2 GB of free disk space and 4 GB of RAM. If Docker will not install or start on your computer, use [`INSTALL_local.md`](INSTALL_local.md) instead.

## 1. Install Docker Desktop

* **Windows 10/11:** Download [Docker Desktop](https://www.docker.com/products/docker-desktop/). Keep the default option "Use WSL 2". Restart when asked. If Docker reports that virtualization is disabled, it must be enabled in your computer's BIOS/UEFI. If that is not possible (e.g. a locked-down computer), use the local install.
* **macOS:** Download Docker Desktop for **Apple silicon** (M1/M2/M3/M4) or **Intel**. To check, Apple menu → About This Mac. Drag it to Applications and open it.
* **Ubuntu:** Follow [Docker's Ubuntu instructions](https://docs.docker.com/engine/install/ubuntu/) for Docker Engine, including the `docker-compose-plugin`. Optionally run `sudo usermod -aG docker $USER` and log back in, to avoid typing `sudo`.

Open Docker Desktop and wait until it says it is running. Then confirm in a terminal (PowerShell on Windows, Terminal on Mac):

```
docker --version
docker compose version
```

Both should print a version number.

## 2. Start MySQL

In a terminal, go to this `mySQL` folder (the one containing `docker-compose.yml`) and run:

```
docker compose up -d
```

The first run downloads the MySQL image (a few hundred MB) and sets up the `school` database. This takes up to a minute or two. Check progress with:

```
docker compose ps
```

Wait until the `STATUS` column says **healthy**. Then test the login:

```
docker compose exec mysql mysql -ustudent -pstudent school -e "SHOW TABLES;"
```

You should see `courses`, `enrollments`, and `students`.

## 3. Everyday commands

| Task | Command |
|---|---|
| Start (after a reboot, etc.) | `docker compose up -d` |
| Stop (keeps your data) | `docker compose stop` |
| Open a MySQL prompt | `docker compose exec mysql mysql -ustudent -pstudent` |
| See logs | `docker compose logs mysql` |
| **Reset everything** to a clean state | `docker compose down -v` then `docker compose up -d` |

## 4. Class 2: load the Citi Bike database

Download `citibike.sql.gz` from UBLearns and put it, **without unzipping it**, in the `data` folder next to `docker-compose.yml`. Then run:

```
docker compose exec mysql sh -c "gunzip -c /data/citibike.sql.gz | mysql -uroot -proot"
```

This takes 1 to 3 minutes and prints nothing when it works. Check it:

```
docker compose exec mysql mysql -ustudent -pstudent citibike -e "SELECT COUNT(*) FROM rides;"
```

You should see 1219444.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Cannot connect to the Docker daemon` / `docker: command not found` | Docker Desktop isn't running (or isn't installed). Open it and wait. |
| `port is already allocated` / `address already in use` for 3306 | Another MySQL is running on your computer. Stop it, or change `"127.0.0.1:3306:3306"` in `docker-compose.yml` to `"127.0.0.1:3307:3306"` and use port **3307** in the notebook. |
| Status stays `starting` for several minutes | Run `docker compose logs mysql` and look for errors. Try `docker compose down -v`, then `up -d` again. |
| Tables are missing after `up` | The first-start scripts only run when the data volume is new. Run `docker compose down -v`, then `docker compose up -d`. |
| Windows: `error during connect` right after install | Restart the computer, open Docker Desktop, and wait for it to finish starting. |
