from fastapi import FastAPI

app = FastAPI(title="Industrial Land Acquisition API")


@app.get("/")
def home():
    return {"message": "Backend is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}