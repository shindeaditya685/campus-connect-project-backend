function extractPublicId(url: string) {
  // Match the pattern between the last '/' and the file extension
  const regex = /\/([^\/]+)\.[a-zA-Z]+$/;
  const match = url.match(regex);

  // If a match is found, return the public ID; otherwise, return null
  return match ? match[1] : null;
}

export { extractPublicId };
