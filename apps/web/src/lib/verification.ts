export function verificationLabel(verifiedAt: string, latestVerifiedAt: string) {
  if (!verifiedAt) return "待核验";
  return verifiedAt === latestVerifiedAt ? "本轮核验" : "历史核验";
}
