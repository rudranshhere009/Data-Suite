import json
import os
import re
import secrets
import uuid
from datetime import datetime, timedelta
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse
from urllib.request import Request, urlopen

import jwt
from flask import Blueprint, jsonify, redirect, request
from flask_cors import CORS

from config import SECRET_KEY, get_allowed_origins
from user_model import User

auth_bp = Blueprint("auth", __name__)
CORS(auth_bp)

EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
USERNAME_SANITIZE_REGEX = re.compile(r"[^a-zA-Z0-9_]+")
OAUTH_STATE_TTL_MINUTES = 10


def _normalize_origin(candidate):
    if not candidate:
        return None

    parsed = urlparse(candidate)
    if not parsed.scheme or not parsed.netloc:
        return None

    return f"{parsed.scheme}://{parsed.netloc}"


def _resolve_frontend_redirect(candidate=None):
    allowed_origins = {
        _normalize_origin(origin)
        for origin in get_allowed_origins()
        if _normalize_origin(origin)
    }

    if candidate:
        candidate_origin = _normalize_origin(candidate)
        if candidate_origin in allowed_origins:
            return candidate

    fallback_origin = next(iter(allowed_origins), "http://localhost:5173")
    return f"{fallback_origin}/"


def _append_query_params(url, params):
    parsed = urlparse(url)
    merged = dict(parse_qsl(parsed.query, keep_blank_values=True))
    merged.update({key: value for key, value in params.items() if value is not None})
    return urlunparse(parsed._replace(query=urlencode(merged), fragment=""))


def _redirect_to_frontend(frontend_redirect, params):
    return redirect(_append_query_params(_resolve_frontend_redirect(frontend_redirect), params))


def _issue_oauth_state(provider, frontend_redirect):
    payload = {
        "provider": provider,
        "frontend_redirect": _resolve_frontend_redirect(frontend_redirect),
        "nonce": secrets.token_urlsafe(12),
        "exp": datetime.utcnow() + timedelta(minutes=OAUTH_STATE_TTL_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def _verify_oauth_state(expected_provider, encoded_state):
    payload = jwt.decode(encoded_state, SECRET_KEY, algorithms=["HS256"])
    if payload.get("provider") != expected_provider:
        raise jwt.InvalidTokenError("OAuth provider mismatch")
    return payload


def _provider_config(provider):
    provider = provider.lower()
    if provider == "google":
        return {
            "label": "Google",
            "client_id": os.getenv("GOOGLE_CLIENT_ID"),
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
            "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
            "token_url": "https://oauth2.googleapis.com/token",
            "userinfo_url": "https://openidconnect.googleapis.com/v1/userinfo",
            "scope": "openid email profile",
            "redirect_uri": os.getenv("GOOGLE_REDIRECT_URI"),
        }

    if provider == "github":
        return {
            "label": "GitHub",
            "client_id": os.getenv("GITHUB_CLIENT_ID"),
            "client_secret": os.getenv("GITHUB_CLIENT_SECRET"),
            "authorize_url": "https://github.com/login/oauth/authorize",
            "token_url": "https://github.com/login/oauth/access_token",
            "userinfo_url": "https://api.github.com/user",
            "scope": "read:user user:email",
            "redirect_uri": os.getenv("GITHUB_REDIRECT_URI"),
        }

    return None


def _backend_callback_url(provider, configured_redirect=None):
    if configured_redirect:
        return configured_redirect

    return f"{request.url_root.rstrip('/')}/api/auth/oauth/{provider}/callback"


def _json_request(url, method="GET", data=None, headers=None):
    request_headers = headers.copy() if headers else {}
    payload = None

    if data is not None:
        payload = urlencode(data).encode("utf-8")
        request_headers.setdefault("Content-Type", "application/x-www-form-urlencoded")

    request_object = Request(url, data=payload, headers=request_headers, method=method)

    try:
        with urlopen(request_object, timeout=15) as response:
            charset = response.headers.get_content_charset("utf-8")
            raw_payload = response.read().decode(charset)
            return json.loads(raw_payload) if raw_payload else {}
    except HTTPError as error:
        message = error.read().decode("utf-8", errors="ignore")
        raise RuntimeError(message or f"OAuth HTTP error: {error.code}") from error
    except URLError as error:
        raise RuntimeError("OAuth network request failed") from error


def _sanitize_username(value, provider):
    sanitized = USERNAME_SANITIZE_REGEX.sub("_", (value or "").strip().lower()).strip("_")
    if not sanitized:
        sanitized = f"{provider}_user"
    if len(sanitized) < 3:
        sanitized = f"{sanitized}_user"
    return sanitized[:24]


def _build_unique_username(base_username):
    candidate = base_username
    suffix = 1

    while User.get_user(candidate):
        numeric_suffix = str(suffix)
        trimmed = base_username[: max(3, 24 - len(numeric_suffix))]
        candidate = f"{trimmed}{numeric_suffix}"
        suffix += 1

    return candidate


def _get_or_create_oauth_user(provider, email, preferred_username):
    existing_user = User.get_user_by_email(email)
    if existing_user:
        return existing_user

    base_username = _sanitize_username(preferred_username or email.split("@")[0], provider)
    username = _build_unique_username(base_username)
    created_user = User.create_user(username, email, uuid.uuid4().hex)

    if created_user:
        return {
            "id": created_user.id,
            "username": created_user.username,
            "email": created_user.email,
        }

    return User.get_user_by_email(email)


def _redirect_with_social_success(frontend_redirect, user_data):
    user = User(user_data["username"], user_data["email"], user_id=user_data.get("id"))
    token = user.generate_token()
    return _redirect_to_frontend(
        frontend_redirect,
        {
            "auth_token": token,
            "auth_username": user_data["username"],
            "auth_email": user_data["email"],
        },
    )


def _fetch_github_email(access_token):
    emails = _json_request(
        "https://api.github.com/user/emails",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
            "User-Agent": "Data-Suite",
        },
    )

    if not isinstance(emails, list):
        return None

    primary_verified = next(
        (item.get("email") for item in emails if item.get("primary") and item.get("verified")),
        None,
    )
    if primary_verified:
        return primary_verified

    verified_email = next((item.get("email") for item in emails if item.get("verified")), None)
    if verified_email:
        return verified_email

    return next((item.get("email") for item in emails if item.get("email")), None)


def _fetch_provider_identity(provider, config, authorization_code):
    redirect_uri = _backend_callback_url(provider, config.get("redirect_uri"))
    token_headers = {"Accept": "application/json"}
    token_data = {
        "code": authorization_code,
        "client_id": config["client_id"],
        "client_secret": config["client_secret"],
        "redirect_uri": redirect_uri,
    }

    if provider == "google":
        token_data["grant_type"] = "authorization_code"

    token_response = _json_request(
        config["token_url"],
        method="POST",
        data=token_data,
        headers=token_headers,
    )

    access_token = token_response.get("access_token")
    if not access_token:
        raise RuntimeError(f"{config['label']} token exchange failed")

    if provider == "google":
        profile = _json_request(
            config["userinfo_url"],
            headers={"Authorization": f"Bearer {access_token}"},
        )
        email = profile.get("email")
        if not email:
            raise RuntimeError("Google did not return an email address")
        if profile.get("email_verified") is False:
            raise RuntimeError("Google email address is not verified")

        return {
            "email": email,
            "username": profile.get("name") or profile.get("given_name") or email.split("@")[0],
        }

    profile = _json_request(
        config["userinfo_url"],
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
            "User-Agent": "Data-Suite",
        },
    )
    email = profile.get("email") or _fetch_github_email(access_token)
    if not email:
        raise RuntimeError("GitHub did not return an email address")

    return {
        "email": email,
        "username": profile.get("login") or email.split("@")[0],
    }


@auth_bp.route("/signup", methods=["POST"])
def signup():
    """User registration endpoint."""
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No data provided"}), 400

        username = data.get("username", "").strip()
        email = data.get("email", "").strip()
        password = data.get("password", "").strip()

        if not username or not email or not password:
            return jsonify({"error": "Username, email, and password are required"}), 400

        if len(username) < 3:
            return jsonify({"error": "Username must be at least 3 characters long"}), 400

        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters long"}), 400

        if not EMAIL_REGEX.match(email):
            return jsonify({"error": "Please provide a valid email address"}), 400

        if User.get_user(username):
            return jsonify({"error": "Username already exists"}), 409
        if User.get_user_by_email(email):
            return jsonify({"error": "Email already exists"}), 409

        user = User.create_user(username, email, password)
        if not user:
            return jsonify({"error": "Failed to create user"}), 500

        token = user.generate_token()

        return jsonify(
            {
                "message": "User created successfully",
                "token": token,
                "user": {
                    "username": username,
                    "email": email,
                },
            }
        ), 201

    except Exception:
        return jsonify({"error": "Internal server error"}), 500


@auth_bp.route("/signin", methods=["POST"])
def signin():
    """User login endpoint."""
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No data provided"}), 400

        identifier = (
            data.get("identifier", "").strip()
            or data.get("username", "").strip()
            or data.get("email", "").strip()
        )
        password = data.get("password", "").strip()

        if not identifier or not password:
            return jsonify({"error": "Username/email and password are required"}), 400

        user_data = User.authenticate(identifier, password)
        if not user_data:
            return jsonify({"error": "Invalid username/email or password"}), 401

        user = User(user_data["username"], user_data["email"], "")
        token = user.generate_token()

        return jsonify(
            {
                "message": "Login successful",
                "token": token,
                "user": {
                    "username": user_data["username"],
                    "email": user_data["email"],
                },
            }
        ), 200

    except Exception:
        return jsonify({"error": "Internal server error"}), 500


@auth_bp.route("/verify", methods=["POST"])
def verify_token():
    """Verify JWT token endpoint."""
    try:
        data = request.get_json()
        token = data.get("token") if data else None

        if not token:
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]

        if not token:
            return jsonify({"error": "No token provided"}), 400

        user_data = User.verify_token(token)
        if not user_data:
            return jsonify({"error": "Invalid or expired token"}), 401

        return jsonify(
            {
                "valid": True,
                "user": {
                    "username": user_data["username"],
                    "email": user_data["email"],
                },
            }
        ), 200

    except Exception:
        return jsonify({"error": "Internal server error"}), 500


@auth_bp.route("/oauth/<provider>/start", methods=["GET"])
def oauth_start(provider):
    provider_name = provider.lower()
    frontend_redirect = request.args.get("frontend_redirect")
    config = _provider_config(provider_name)

    try:
        if not config:
            return _redirect_to_frontend(frontend_redirect, {"auth_error": "Unsupported social provider."})

        if not config["client_id"] or not config["client_secret"]:
            return _redirect_to_frontend(
                frontend_redirect,
                {"auth_error": f"{config['label']} sign-in is not configured yet."},
            )

        redirect_uri = _backend_callback_url(provider_name, config.get("redirect_uri"))
        state = _issue_oauth_state(provider_name, frontend_redirect)
        query_params = {
            "client_id": config["client_id"],
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": config["scope"],
            "state": state,
        }

        return redirect(f"{config['authorize_url']}?{urlencode(query_params)}")
    except Exception as error:
        provider_label = config["label"] if config else provider_name.title()
        return _redirect_to_frontend(
            frontend_redirect,
            {"auth_error": str(error) or f"{provider_label} sign-in failed."},
        )


@auth_bp.route("/oauth/<provider>/callback", methods=["GET"])
def oauth_callback(provider):
    provider_name = provider.lower()
    config = _provider_config(provider_name)
    fallback_redirect = request.args.get("frontend_redirect")

    if not config:
        return _redirect_to_frontend(fallback_redirect, {"auth_error": "Unsupported social provider."})

    try:
        provider_error = request.args.get("error")
        if provider_error:
            return _redirect_to_frontend(
                fallback_redirect,
                {"auth_error": f"{config['label']} sign-in was cancelled."},
            )

        encoded_state = request.args.get("state")
        authorization_code = request.args.get("code")
        if not encoded_state or not authorization_code:
            return _redirect_to_frontend(
                fallback_redirect,
                {"auth_error": f"{config['label']} sign-in response was incomplete."},
            )

        state_payload = _verify_oauth_state(provider_name, encoded_state)
        frontend_redirect = state_payload.get("frontend_redirect")
        identity = _fetch_provider_identity(provider_name, config, authorization_code)
        user_data = _get_or_create_oauth_user(
            provider_name,
            identity["email"],
            identity.get("username"),
        )

        if not user_data:
            return _redirect_to_frontend(
                frontend_redirect,
                {"auth_error": f"Unable to finish {config['label']} sign-in."},
            )

        return _redirect_with_social_success(frontend_redirect, user_data)

    except jwt.ExpiredSignatureError:
        return _redirect_to_frontend(
            fallback_redirect,
            {"auth_error": f"{config['label']} sign-in timed out. Please try again."},
        )
    except jwt.InvalidTokenError:
        return _redirect_to_frontend(
            fallback_redirect,
            {"auth_error": "Social sign-in state was invalid. Please try again."},
        )
    except Exception as error:
        return _redirect_to_frontend(
            fallback_redirect,
            {"auth_error": str(error) or f"{config['label']} sign-in failed."},
        )
