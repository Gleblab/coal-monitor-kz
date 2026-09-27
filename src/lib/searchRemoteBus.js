const listeners = new Set()
let remoteState = {}

export function ingestSearchRemote(key, payload) {
  if (!key || payload == null) return
  remoteState = { ...remoteState, [key]: payload }
  for (const listener of listeners) listener(remoteState)
}

export function subscribeSearchRemote(listener) {
  listeners.add(listener)
  listener(remoteState)
  return () => listeners.delete(listener)
}

export function getSearchRemoteState() {
  return remoteState
}
