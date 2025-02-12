import getopt
import sys
import string
import os
import random
import rich
from rich.console import Console
from flask import Flask, jsonify
from jwcrypto import jwk

console = Console()

def read_pem_key():
    # check if key file exists        
    with open(key_path) as f:
        pem_data = f.read()
    f.closed

    pem_data_encode = pem_data.encode("utf-8")
    return jwk.JWK.from_pem(pem_data_encode)


def get_keys_from(key):
    private_key = key.export_private()
    public_key = key.export_public(as_dict=True)
    public_key['alg'] = 'RS256'
    public_key['use'] = 'sig'
    return (public_key, private_key)



opts, args = getopt.getopt(sys.argv[1:], "", ["read-key="])

key_function = None
key_path:str = None

for opt, arg in opts:
    if opt in ("--read-key"):
        key_function = read_pem_key
        key_path = arg
        if not key_path:
            raise Exception("Path to your private key not specified: Use --key-path=<key-path>")
        
        if not os.path.isfile(key_path):
            raise Exception(f"Private pem key not found in {key_path}.\nYou could generate one with `openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out private_key.pem`")

if key_function is None:
    raise Exception("key function not specified: Use --read-key=<path-to-private-pem-key>")


app = Flask(__name__)

# Define a route for the JWKS endpoint
@app.route('/.well-known/jwks.json')
def jwks():
    public_key, _ = get_keys_from(key_function())
    return jsonify({"keys": [public_key]})

console.print("This server is for demo purposes only. Do not use as is in production", style="bold red")

# Run the Flask application
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8085)
