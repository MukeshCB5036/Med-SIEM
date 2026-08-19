# MedSIEM Developer Guide

## Local Development Setup

### 1. Start Support Infrastructure
```bash
docker-compose -f docker/docker-compose.yml up -d
```

### 2. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -c "from app.core.database import Base, engine; from app.db.seed import seed_database; from sqlalchemy.orm modal; Base.metadata.create_all(bind=engine); Session=sessionmaker(bind=engine); s=Session(); seed_database(s); s.close()"
uvicorn app.main:app --reload --port 8000
```
Interactive Swagger API documentation will be accessible at `http://localhost:8000/api/v1/docs`.

### 3. Web Dashboard Setup
```bash
cd frontend
npm install
npm run dev
```
Access the SOC Web Dashboard at `http://localhost:3000`.

### 4. Android Setup
```bash
cd android
npm install
npx react-native run-android
```
For standalone APK generation, run `./gradlew assembleDebug` in `android/`.

---

## Testing Strategy

- **Backend Pytest Suite**: `pytest` inside `backend/`.
- **Frontend Jest Tests**: `npm test` inside `frontend/`.
- **Android Jest Tests**: `npm test` inside `android/`.
