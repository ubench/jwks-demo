import base64
import requests
import uuid
import json
import os
import getopt
import sys
import rich
from jwcrypto import jwk, jwt
from datetime import datetime as dt

opts, args = getopt.getopt(sys.argv[1:], "", ["auth-host=", "realm=", "client-id=", "key-path=", "no-self-hosted"])

auth_host:str = None
realm:str = None
client_id:str = None
key_path:str = None
self_hosted:bool = True

for opt, arg in opts:
    if opt in ("--auth-host"):
        auth_host = arg
    elif opt in ("--realm"):
        realm = arg
    elif opt in ("--client-id"):
        client_id = arg
    elif opt in ("--key-path"):
        key_path = arg
    elif opt in ("--no-self-hosted"):
        self_hosted = False

if auth_host is None:
    raise Exception("UBench authentication server host not specified: Use --auth-host=<auth-host>")

if realm is None:
    raise Exception("UBench api realm not specified: Use --realm=<realm>")

if client_id is None:
    raise Exception("UBench client-id not specified: Use --client-id=<client-id>")

if key_path is None:
    raise Exception("Path to your private key not specified: Use --key-path=<key-path>")

auth_url = f"{auth_host}/auth/realms/{realm}"
token_endpoint = f"{auth_url}/protocol/openid-connect/token"

# check if private key exists
if not os.path.isfile(key_path):
    raise Exception(f"\nprivate pem key not found in {key_path}.\nPlease generate one with `openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out {key_path}`")


with open(key_path) as f:
    pem_data = f.read()
    f.close()

pem_data_encode = pem_data.encode("utf-8")
key = jwk.JWK.from_pem(pem_data_encode)

private_key = key.export_private()
public_key = key.export_public(as_dict=True)


def generate_signed_jwt(client_id):

    jwt_header = {
        'alg': 'RS256',

        # Don't set the key ID if you don't serve the public key yourself, but chose to sent it to UBench
        'kid': key.get('kid') if self_hosted else None,
    }

    jwt_claims = {
        'jti': uuid.uuid4().hex,
        'iss': client_id,
        'sub': client_id,
        'aud': token_endpoint,
        'iat': int(dt.now().timestamp()),
        'exp': int(dt.now().timestamp())+600

    }

    jwt_token = jwt.JWT(
        header=jwt_header,
        claims=jwt_claims,
    )
    jwt_token.make_signed_token(key)
    return jwt_token.serialize()


def request_access_token(client_id:str):
    signed_jwt = generate_signed_jwt(client_id)

    data = {
        'grant_type': 'client_credentials',
        'client_id': client_id,
        'client_assertion_type': 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        'client_assertion': signed_jwt,
    }

    response = requests.post(token_endpoint, data=data)
    response_json = json.loads(response.text)
    if response.status_code != 200:
        rich.print_json(data=response_json)
        return {}
    else:
        # Add the decoded access_token to the response for debug reasons
        response_json["access_token_decrypted"] = json.loads(base64.urlsafe_b64decode(response_json["access_token"].split('.')[1] + '==').decode('utf-8'))
        return response_json


# Run the Flask application
if __name__ == '__main__':
    signed_jwt = request_access_token(client_id)
    if signed_jwt: 
        rich.print_json(data=signed_jwt)

    jwt_token_to_use_as_bearer = signed_jwt.get('access_token', None)

    # use the token as bearer Authorization to access the UBench API
    headers = {
        'Authorization': f'Bearer {jwt_token_to_use_as_bearer}',
        'Content-Type': 'application/json'
    }

    # ...
