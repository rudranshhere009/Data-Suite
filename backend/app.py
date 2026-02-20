from config import create_app

# Create and configure the Flask app, ensuring DB and tables exist
app = create_app()

if __name__ == "__main__":
    print("Starting backend server. Database and tables will be checked/created if missing.")
    app.run(debug=True, host="0.0.0.0")
