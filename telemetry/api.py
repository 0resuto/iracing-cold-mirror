from fastapi import FastAPI


app = FastAPI()

@app.get("/api/status")
def get_status():
    return {"status": "ok", "message": "API is running"}