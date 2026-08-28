# Development

Run the existing app locally with the commands in the root README. Validate the
architecture without external services using:

```powershell
.\venv\Scripts\python.exe -m compileall app backend eval
.\venv\Scripts\python.exe -m pytest -q
cd frontend; npm run build
```
