package com.ubench.demo.jwks.common;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPrivateCrtKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.PKCS8EncodedKeySpec;
import org.bouncycastle.util.encoders.Hex;
import org.bouncycastle.util.io.pem.PemReader;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import lombok.SneakyThrows;

@Component
public class PrivatePemComponent {

   public RSAPrivateCrtKey readPrivateKey(final String pemFile) throws NoSuchAlgorithmException, IOException, InvalidKeySpecException {
      final var factory = KeyFactory.getInstance("RSA");

      try (final FileReader reader = new FileReader(pemFile);
           final PemReader pemReader = new PemReader(reader)) {

         final var pemObject = pemReader.readPemObject();
         final var content = pemObject.getContent();
         final var privateKeySpec = new PKCS8EncodedKeySpec(content);

         return (RSAPrivateCrtKey) factory.generatePrivate(privateKeySpec);
      }
   }

   @SneakyThrows
   public RSAPublicKey readPublicKey(final String pemFile) {
      final var factory = KeyFactory.getInstance("RSA");

      try (final InputStream inputStream = new ClassPathResource(pemFile).getInputStream();
           final BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream));
           final PemReader pemReader = new PemReader(reader)) {

         final var pemObject = pemReader.readPemObject();
         final var content = pemObject.getContent();
         final var privateKeySpec = new PKCS8EncodedKeySpec(content);

         return (RSAPublicKey) factory.generatePublic(privateKeySpec);
      }
   }

   public String getThumbprint(final byte[] bytes) throws NoSuchAlgorithmException {
      final var md = MessageDigest.getInstance("SHA-1");
      md.update(bytes);
      return Hex.toHexString(md.digest());
   }
}
