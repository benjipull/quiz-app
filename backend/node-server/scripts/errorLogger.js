function addErrorPrefix(args) {
  if (!Array.isArray(args) || args.length === 0) {
    return ["❌"];
  }

  const [first, ...rest] = args;
  if (typeof first === "string") {
    const trimmed = first.trimStart();
    if (trimmed.startsWith("❌")) {
      return [first, ...rest];
    }
    return [`❌ ${first}`, ...rest];
  }

  return ["❌", first, ...rest];
}

function isScriptCallSite() {
  const stack = String(new Error().stack || "");
  return /backend[\\/]+node-server[\\/]+(?:scripts[\\/]+|populateAll[^\\/]*\.js)/i.test(stack);
}

function installScriptErrorPrefix() {
  if (console.__scriptErrorPrefixInstalled) {
    return;
  }

  const originalError = console.error.bind(console);
  console.error = (...args) => {
    if (isScriptCallSite()) {
      originalError(...addErrorPrefix(args));
      return;
    }
    originalError(...args);
  };

  console.__scriptErrorPrefixInstalled = true;
}

module.exports = {
  installScriptErrorPrefix,
};
