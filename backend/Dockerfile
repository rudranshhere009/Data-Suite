# Backend Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .
# Copy the CSV file from the backend folder into the image
COPY ships_with_dynamics_heading.csv /app/

EXPOSE 5000

CMD ["python", "app.py"]
