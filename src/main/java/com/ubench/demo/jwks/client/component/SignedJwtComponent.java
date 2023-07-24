package com.ubench.demo.jwks.client.component;

import java.io.IOException;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPrivateCrtKey;
import java.security.spec.InvalidKeySpecException;
import java.util.Date;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

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

    @Value("${ubench.public-key-is-served}")
    private boolean youServeThePublicKeyYourself;

    @Autowired
    public SignedJwtComponent(final PrivatePemComponent privatePemComponent) {
        this.privatePemComponent = privatePemComponent;
    }

    public String generateSignedJwt() throws NoSuchAlgorithmException, IOException, InvalidKeySpecException, JOSEException {
        final var privateKey = privatePemComponent.readPrivateKey(privateKeyPemFile);
        final SignedJWT signedJWT = createJWTToken(privateKey);
        signJWTTokenWithRSASignature(privateKey, signedJWT);
        return signedJWT.serialize();
    }

    private void signJWTTokenWithRSASignature(RSAPrivateCrtKey privateKey, SignedJWT signedJWT) throws JOSEException {
        final var signer = new RSASSASigner(privateKey);
        signedJWT.sign(signer);
    }


    private SignedJWT createJWTToken(RSAPrivateCrtKey privateKey) throws NoSuchAlgorithmException {
        final JWSHeader.Builder headerBuilder = new JWSHeader.Builder(JWSAlgorithm.RS256);
        if (youServeThePublicKeyYourself) {
            headerBuilder.keyID(privatePemComponent.getThumbprint(privateKey.getEncoded()));
        }
        final var header = headerBuilder.build();

        final var claims = new JWTClaimsSet.Builder()
                .jwtID(UUID.randomUUID().toString())
                .issuer(clientId)
                .subject(clientId)
                .audience(String.format("%s/auth/realms/%s/protocol/openid-connect/token", authHost, authRealm))
                .issueTime(new Date())
                .expirationTime(new Date(System.currentTimeMillis() + TimeUnit.MINUTES.toMillis(5)))
                .build();

        return new SignedJWT(header, claims);
    }

}
