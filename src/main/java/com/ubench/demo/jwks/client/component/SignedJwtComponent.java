package com.ubench.demo.jwks.client.component;

import java.io.IOException;
import java.security.NoSuchAlgorithmException;
import java.security.spec.InvalidKeySpecException;
import java.util.Date;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.ubench.demo.jwks.common.PrivatePemComponent;

@Component
public class SignedJwtComponent {

   private final PrivatePemComponent privatePemComponent;

   @Value("${ubench.auth.client-id}")
   private String clientId;

   @Value("${ubench.auth.host}")
   private String authHost;

   @Value("${ubench.auth.realm}")
   private String authRealm;

   @Value("${ubench.key.path}")
   public String privateKeyPemFile;

   @Autowired
   public SignedJwtComponent(final PrivatePemComponent privatePemComponent) {
      this.privatePemComponent = privatePemComponent;
   }

   public String generateSignedJwt() throws NoSuchAlgorithmException, IOException, InvalidKeySpecException, JOSEException {
      final var privateKey = privatePemComponent.readPrivateKey(privateKeyPemFile);

      final var header = new JWSHeader.Builder(JWSAlgorithm.RS256)

            // Don't set the key ID if you don't serve the public key yourself, but chose to sent it to UBench
            .keyID(privatePemComponent.getThumbprint(privateKey.getEncoded()))

            .build();

      final var claims = new JWTClaimsSet.Builder()
            .jwtID(UUID.randomUUID().toString())
            .issuer(clientId)
            .subject(clientId)
            .audience(String.format("%s/auth/realms/%s/protocol/openid-connect/token", authHost, authRealm))
            .issueTime(new Date())
            .expirationTime(new Date(new Date().getTime() + 300 * 1000)) // 5 minutes from now
            .build();

      // Create the RSA-signer with the private key
      final var signer = new RSASSASigner(privateKey);

      // Prepare the JWT object
      final var signedJWT = new SignedJWT(header, claims);

      // Compute the RSA signature on the JWT
      signedJWT.sign(signer);

      // Serialize the signed JWT to a compact format
      return signedJWT.serialize();
   }

}
