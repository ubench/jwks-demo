package com.ubench.demo.jwks.server.component;

import com.nimbusds.jose.Algorithm;
import com.nimbusds.jose.jwk.KeyUse;
import com.nimbusds.jose.jwk.RSAKey;
import com.ubench.demo.jwks.common.PrivatePemComponent;
import lombok.SneakyThrows;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.KeyFactory;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPrivateCrtKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.RSAPublicKeySpec;

@Component
public class JwkComponent {

   @Value("${ubench.key.path}")
   public String privateKeyPemFile;

   private final PrivatePemComponent privatePemComponent;

   @Autowired
   public JwkComponent(PrivatePemComponent privatePemComponent) {
      this.privatePemComponent = privatePemComponent;
   }

   @SneakyThrows
   public String generateJWKasJson() {
      return generateJWK(privatePemComponent.readPrivateKey(privateKeyPemFile)).toJSONString();
   }

   private RSAKey generateJWK(final RSAPrivateCrtKey privateKey) throws NoSuchAlgorithmException, InvalidKeySpecException {
      final RSAPublicKey myPublicKey = generatePublicKey(privateKey);
      final var thumbprint = privatePemComponent.getThumbprint(privateKey.getEncoded());

      return new RSAKey.Builder(myPublicKey)
            .keyUse(KeyUse.SIGNATURE)
            .algorithm(new Algorithm("RS256"))
            .keyID(thumbprint)
            .build();
   }

   private RSAPublicKey generatePublicKey(RSAPrivateCrtKey privateKey) throws NoSuchAlgorithmException, InvalidKeySpecException {
      final var publicKeySpec = new RSAPublicKeySpec(privateKey.getModulus(), privateKey.getPublicExponent());
      final var keyFactory = KeyFactory.getInstance("RSA");
      return (RSAPublicKey) keyFactory.generatePublic(publicKeySpec);
   }

}
