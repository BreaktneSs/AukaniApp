import { authenticator } from "otplib"
import QRCode from "qrcode"

const ISSUER = "Aukani POS"

export const totpService = {
  async generateSetup(email) {
    const secret = authenticator.generateSecret()
    const otpauthUrl = authenticator.keyuri(email, ISSUER, secret)
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl)
    return { secret, qrDataUrl }
  },

  verify(secret, code) {
    if (!secret || !code) return false
    try {
      return authenticator.verify({ token: String(code), secret })
    } catch {
      return false
    }
  },
}
