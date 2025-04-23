# JWKS <!-- omit in toc -->
To send requests to the UBench API, you need to authenticate yourself. To do so, you need to
request an authorization token from the UBench authentication server which can be used as
Bearer authorization. The UBench API will verify this Bearer token with the UBench
authentication server. If the token is valid, the request will be processed.

There are several ways to authenticate with the UBench authentication server, all involving
the use of JWT tokens. The JWT format is defined by [IETF](https://ietf.org/) specification 
[RFC 7519](https://tools.ietf.org/html/rfc7519). The preferred
way is **using a public/private key authentication**. Doing so, UBench can guarantee your data safety. 
Because you generate your own private key, you are the only one who can sign the JWT token
with which you request an authorization code to access the UBench API.
Moreover, the private key doesn't leave your server. Only the public key is used by the UBench authentication server to verify the signature of the JWT token. 
This way, even without knowing the private key and without exchanging passwords, UBench can
verify that the authentication request is coming from you and not someone else.

To be even more secure, the private key can be rotated on a regular (or irregular) basis. 
This way, even in the event that your private key is compromised, the damage is limited to
the period between the last rotation and the moment the key was compromised.

By serving the public part of the key using a jwks server, **you never have to notify UBench
that you changed your private key**. Whenever you decide to rotate your private key, you can
update the public key on your server. UBench will automatically use the new key to verify 
the signature of the JWT token.

In this repository, you can find inspiration on how to implement a jwks server in Java and Python. 
It uses your private key and generates the public key on the fly. This way, the only thing you have to do
is to generate a (new) private key and put it in the correct folder. The jwks server will take care of the rest.

- [Prerequisites](#prerequisites)
- [Server information](#server-information)
- [Content of the messages](#content-of-the-messages)
  - [Requesting a bearer token](#requesting-a-bearer-token)
  - [Response of the UBench authentication server](#response-of-the-ubench-authentication-server)
- [☕ Java implementation](#-java-implementation)
  - [tl;dr](#tldr)
  - [Configuration](#configuration)
  - [Serve the public key](#serve-the-public-key)
  - [Request an authorization token](#request-an-authorization-token)
- [🐍 Python implementation](#-python-implementation)
  - [tl;dr](#tldr-1)
  - [Prerequisites](#prerequisites-1)
  - [Serve a key](#serve-a-key)
  - [Request an authorization token](#request-an-authorization-token-1)
- [🟨 Node.js implementation](#-nodejs-implementation)
  - [tl;dr](#tldr-2)
  - [Prerequisites](#prerequisites-2)
  - [Serve a key](#serve-a-key-1)
  - [Request an authorization token](#request-an-authorization-token-2)
- [What if I can't serve a jwks server?](#what-if-i-cant-serve-a-jwks-server)
  - [Omit the key id](#omit-the-key-id)


## Prerequisites
For this project, you need a private key. If you don't have one already, or if you can't grab one somewhere, you can generate your private key using the following command:
```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out private_key.pem
```
This will generate a `private_key.pem` file. Save the file in a secure location. 
This is your private key. **Never share this key with anyone. Don't put it on a public accessible url**.

You are free to use any of the following [JWA algorithms](https://datatracker.ietf.org/doc/html/rfc7518):
1. <details>
     <summary>RS256 (RSA with SHA-256) - default</summary>
     RS256 is an RSA-based digital signature algorithm that uses the SHA-256 hash function. It is
     widely used in various protocols and applications for generating and verifying digital 
     signatures.
   </details>

1. <details>
     <summary>RS384 (RSA with SHA-384)</summary>
     RS384 is similar to RS256 but uses the SHA-384 hash function. It provides a higher level of 
     security due to the larger hash size.
   </details>

1. <details>
     <summary>RS512 (RSA with SHA-512)</summary>
     RS512 is similar to RS256 and RS384 but uses the SHA-512 hash function. It offers the highest 
     level of security among the RS algorithms.
   </details>

1. <details>
     <summary>ES256 (Elliptic Curve Signature Algorithm with SHA-256)</summary>
     ES256 is an elliptic curve digital signature algorithm that uses the SHA-256 hash function. 
     It is commonly used for generating and verifying digital signatures with the elliptic curve 
     cryptography approach. The security of ES256 relies on the difficulty of solving the elliptic 
     curve discrete logarithm problem.
   </details>

1. <details>
     <summary>ES384 (Elliptic Curve Signature Algorithm with SHA-384)</summary>
     ES384 is similar to ES256 but uses the SHA-384 hash function instead of SHA-256. It provides 
     a higher level of security due to the larger hash size, making it suitable for scenarios 
     where stronger security is required.
   </details>

1. <details>
     <summary>ES512 (Elliptic Curve Signature Algorithm with SHA-512)</summary>
     ES512 is similar to ES256 and ES384 but uses the SHA-512 hash function. It offers the highest 
     level of security among the ES algorithms due to the larger hash size, but it may also be 
     slower in certain implementations.
   </details>

1. <details>
     <summary>PS256 (RSA-PSS with SHA-256)</summary>
     PS256 is an RSA-based digital signature algorithm with the Probabilistic Signature Scheme 
     (PSS) padding and SHA-256 hash function. It provides improved security over traditional RSA 
     signatures and is more resilient against certain cryptographic attacks.
   </details>

1. <details>
     <summary>PS384 (RSA-PSS with SHA-384)</summary>
     PS384 is similar to PS256 but uses the SHA-384 hash function. It provides a higher level of 
     security due to the larger hash size.
   </details>

1. <details>
     <summary>PS512 (RSA-PSS with SHA-512)</summary>
     PS512 is similar to PS256 and PS384 but uses the SHA-512 hash function. It offers the highest 
     level of security among the PS algorithms.
   </details>

## Server information
This README uses https://approval.ubenchinternational.com as the UBench authentication server.
For production, you should use https://www.ubench.com

## Content of the messages
To make sure that the UBench authentication server can verify the JWT token, it is important that the messages you're sending contain the correct information.

### Requesting a bearer token
The message that you use to request the bearer token, contains the following information:
* `grant_type`: the grant type you want to use. For the UBench API, you must use `client_credentials`
* `client_id`: the client id you got from UBench
* `client_assertion_type`: the type of assertion you use. For the UBench API, you should use `urn:ietf:params:oauth:client-assertion-type:jwt-bearer`
* `client_assertion`: the signed JWT token. This token is signed with your private key and can be verified by the UBench authentication server using your public key.

An example json content of the message:
```json
{
  "grant_type": "client_credentials",
  "client_id": "ws-your-client-id-1234-5678-90ab-cdef01234567",
  "client_assertion_type": "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
  "client_assertion": "signed-jwt-token"
}
```

#### Signed JWT token <!-- omit in toc -->
You can see that the message contains a signed JWT token as `client_assertion`. This token is signed with your private key. The UBench authentication server will use your public key to verify the signature of the JWT token.

The JWT token contains three parts: the header, the payload, and the signature.

The header of the signed JWT token contains the following information:
* `alg`: the algorithm used to sign the JWT token. For the UBench API, you should use `RS256`
* `kid`: the key id of the key used to sign the JWT token. This is only required if you serve the public key yourself. If you send the public key to UBench, you must omit this field.


The payload or claim of the signed JWT token contains the following information:
* `jti`: a unique identifier for the token that you can generate yourself, randomly
* `iss`: the client id you got from UBench
* `sub`: the client id you got from UBench
* `aud`: the audience of the token. This is the URL of the UBench authentication server
* `iat`: the time the token was issued. This is a timestamp in seconds since the epoch.
* `exp`: the expiration time of the token. This is a timestamp in seconds since the epoch and must be after the `iat` time.

An example json content of the signed JWT token:
```json
{
  "jti": "unique-private-key-identifier",
  "iss": "ws-your-client-id-1234-5678-90ab-cdef01234567",
  "aud": "https://approval.ubenchinternational.com/auth/realms/ubench-api/protocol/openid-connect/token",
  "sub": "ws-your-client-id-1234-5678-90ab-cdef01234567",
  "iat": 1640991600,
  "exp": 1640995200
}
```

### Response of the UBench authentication server
The UBench authentication server will respond with a json message containing the following information:
* `access_token`: the bearer token you can use to authenticate with the UBench API
* `expires_in`: the time in seconds the bearer token is valid
* `token_type`: the type of token. For the UBench API, this is `Bearer`
* `scope`: the scope of the token

As stated, the token that you can find in `access_token` is the bearer token that you can use to authenticate with the UBench API.

## ☕ Java implementation

### tl;dr
* JWKS server inspiration in `com.ubench.demo.jwks.server.web.JwksController`
* Request bearer token inspiration in `com.ubench.demo.jwks.client.RequestBearerApp`

### Configuration
You can change the configuration in the file `src/main/resources/application.yaml`
or put the following lines in a new file `application-dev.yaml` in the root of the java
project. Set the following properties according to the information you got from UBench:

```yaml
ubench:
  auth:
    client-id: your-ubench-client-id
    host: https://approval.ubenchinternational.com
  key:
    path: /path/to/your/private_key.pem
```    

### Serve the public key
> [!WARNING]
> _This is a demo implementation and not intended for production use._
> _Use this code for testing purposes and as inspiration for your own implementation._
 
Launch the jwks server using the following command. 
If you use the `application-dev.yaml` file, add `-Pdev` to the command.

```bash
./mvnw spring-boot:run -Pserve
```

On windows, use the following command:
```powershell
.\mvnw.cmd spring-boot:run -Pserve
```

The public key will be available at http://localhost:8085/.well-known/jwks.json

Make this url available on a public accessible server and send the url to the UBench team.
They can then configure their client to fetch your public key from this url. The UBench auth
server will use this key to verify whether the signed JWT token - which you will generate in
a moment - is valid.

You can find the implementation in `com.ubench.demo.jwks.server.web.JwksController`

### Request an authorization token

When the URL to the jkws server is known and configured by UBench, you can use the following
command to request an authorization token. The command will generate a signed JWT token using
the private key you previously generated, then send it to the
UBench authentication server. This server will contact your jwks server to download the
public key, then verify the signature of the signed JWT token. If verification is successful,
a bearer token is generated and returned by the UBench authentication server.

If you use the `application-dev.yaml` file, add `-Pdev` to the command.

```bash
./mvnw spring-boot:run -Prequest-bearer
```

On windows, use the following command:
```powershell
.\mvnw.cmd spring-boot:run -Prequest-bearer
```

## 🐍 Python implementation

### tl;dr
* JWKS server inspiration in `ubench/jwks/serve.py`
* Request bearer token inspiration in `ubench/jwks/request_token.py`

### Prerequisites
Install the necessary python packages using the following command:
```bash
# Install python requirements
pip install --upgrade flask jwcrypto requests rich
```

The following commands must be executed in the folder `src/main/python`

### Serve a key
> [!WARNING]
> _This is a demo implementation and not intended for production use._
> _Use this code for testing purposes and as inspiration for your own implementation._

To launch the demo implementation, you can use the following command:

```bash
python -m ubench.jwks.serve --read-key=/path/to/your/private_key.pem
```

The public key will be available at http://localhost:8085/.well-known/jwks.json

Make this url available on a public accessible server and send the url to the UBench team.
They can then configure their client to fetch your public key from this url. The UBench auth
server will use this key to verify whether the signed JWT token - which you will generate in
a moment - is valid.

### Request an authorization token
When the URL to the jkws server is known and configured by UBench, you can use the following
command to request an authorization token. The command will generate a signed JWT token using
the private key you previously generated, then send it to the
UBench authentication server. This server will contact your jwks server to download the
public key, then verify the signature of the signed JWT token. If verification is successful,
a bearer token is generated and returned by the UBench authentication server.

Change `auth-host`, `client-id` according to the information you got from UBench.
Change `key-path` to the path of your private key.

```bash
python -m ubench.jwks.request-bearer --auth-host=https://approval.ubenchinternational.com --realm=ubench-api --client-id=your-client-id --key-path=/path/to/your/private_key.pem
```

## 🟨 Node.js implementation

### tl;dr
* JWKS server inspiration in `src/main/nodejs/serve.js`
* Request bearer token inspiration in `src/main/nodejs/request-bearer.js`

### Prerequisites
Install the necessary Node.js packages using yarn:
```bash
# Install node dependencies
cd src/main/nodejs
yarn install
```

The following commands must be executed in the folder `src/main/nodejs`

### Serve a key
> [!WARNING]
> _This is a demo implementation and not intended for production use._
> _Use this code for testing purposes and as inspiration for your own implementation._

To launch the demo implementation, you can use the following command:

```bash
yarn serve -- --read-key=/path/to/your/private_key.pem
```

The public key will be available at http://localhost:8085/.well-known/jwks.json

Make this url available on a public accessible server and send the url to the UBench team.
They can then configure their client to fetch your public key from this url. The UBench auth
server will use this key to verify whether the signed JWT token - which you will generate in
a moment - is valid.

### Request an authorization token
When the URL to the jkws server is known and configured by UBench, you can use the following
command to request an authorization token. The command will generate a signed JWT token using
the private key you previously generated, then send it to the
UBench authentication server. This server will contact your jwks server to download the
public key, then verify the signature of the signed JWT token. If verification is successful,
a bearer token is generated and returned by the UBench authentication server.

Change `auth-host`, `client-id` according to the information you got from UBench.
Change `key-path` to the path of your private key.

```bash
yarn request-bearer --auth-host=https://approval.ubenchinternational.com --realm=ubench-api --client-id=your-client-id --key-path=/path/to/your/private_key.pem
```

## What if I can't serve a jwks server?
Setting up a jwks server is the preferred and easiest way to authenticate with UBench. It's
not required to set up a separate server: you could even encorporate it in your backend that
communicates with the UBench server. 

If it's really impossible to set up a jwks server, you can send your public key 
to the UBench team. They will statically configure the authentication server to use your public key to verify the signature of the JWT token you'll send while [signing the jwt token](#signed-jwt-token) which you have to use in the `client_assertion` in the message to [request the bearer token](#requesting-a-bearer-token).
**Never send the private key to anyone!**

To generate the public key, use the following command:
```bash
openssl rsa -in private_key.pem -pubout -out public_key.pem
```
This will generate a `public_key.pem` file. Send this file to the UBench team.

> [!IMPORTANT]
> _Even if you send the public key to UBench instead of hosting a JWKS server, **you still need to request a bearer token** and use it as bearer authentication for your requests to the UBench API. Make sure to inspect the "request a bearer token" demo code in the provided implementations to understand how to properly authenticate with the UBench API._

### Omit the key id
It's important that you don't send a key id in the header of the signed JWT token.
To make the request-bearer-token demo code work, **you must**

* ☕ **Java**: add the property `ubench.public-key-is-served: false` to the `application.yaml` file.<br/>
* 🐍 **Python**: add the parameter `--no-self-hosted` to the `python -m ubench.jwks.request-bearer` command<br/>
* 🟨 **NodeJS**: add the parameter `--no-self-hosted` to the `yarn request-bearer` command<br/>

> [!NOTE]
> _If you send the public part of your key to UBench, and you need or want to change your
> public key, you'll have to re-send the accompanying public key to UBench. Only when the
> new public key is configured, you can take your private key in production.
> There will be down-time during this process. Serving the JWK key publicly is easier 
> to maintain and to guarantee uptime._