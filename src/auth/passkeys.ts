const fromBase64Url = (value: string): ArrayBuffer => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
  return bytes.buffer;
};

const toBase64Url = (value: ArrayBuffer | null): string | null => {
  if (value === null) return null;
  const bytes = new Uint8Array(value);
  let binary = '';
  bytes.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const supportsPasskeys = (): boolean =>
  typeof window !== 'undefined' && 'PublicKeyCredential' in window && Boolean(navigator.credentials);

export const prepareCreationOptions = (options: CredentialCreationOptions): CredentialCreationOptions => {
  const publicKey = options.publicKey as PublicKeyCredentialCreationOptions & {
    challenge: string;
    user: PublicKeyCredentialUserEntity & {id: string};
    excludeCredentials?: Array<PublicKeyCredentialDescriptor & {id: string}>;
  };
  return {
    ...options,
    publicKey: {
      ...publicKey,
      challenge: fromBase64Url(publicKey.challenge),
      user: {...publicKey.user, id: fromBase64Url(publicKey.user.id)},
      excludeCredentials: publicKey.excludeCredentials?.map(item => ({
        ...item,
        id: fromBase64Url(item.id),
      })),
    },
  };
};

export const prepareRequestOptions = (options: CredentialRequestOptions): CredentialRequestOptions => {
  const publicKey = options.publicKey as PublicKeyCredentialRequestOptions & {
    challenge: string;
    allowCredentials?: Array<PublicKeyCredentialDescriptor & {id: string}>;
  };
  return {
    ...options,
    publicKey: {
      ...publicKey,
      challenge: fromBase64Url(publicKey.challenge),
      allowCredentials: publicKey.allowCredentials?.map(item => ({
        ...item,
        id: fromBase64Url(item.id),
      })),
    },
  };
};

export const serializeCredential = (credential: PublicKeyCredential): Record<string, unknown> => {
  const response = credential.response;
  const serializedResponse: Record<string, unknown> = {
    clientDataJSON: toBase64Url(response.clientDataJSON),
  };

  if ('attestationObject' in response) {
    const attestation = response as AuthenticatorAttestationResponse;
    serializedResponse.attestationObject = toBase64Url(attestation.attestationObject);
    serializedResponse.transports = attestation.getTransports?.() ?? [];
  } else {
    const assertion = response as AuthenticatorAssertionResponse;
    serializedResponse.authenticatorData = toBase64Url(assertion.authenticatorData);
    serializedResponse.signature = toBase64Url(assertion.signature);
    serializedResponse.userHandle = toBase64Url(assertion.userHandle);
  }

  return {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: serializedResponse,
  };
};
