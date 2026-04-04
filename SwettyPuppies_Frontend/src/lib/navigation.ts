export function navigateTo(path: string) {
  if (window.location.pathname === path) {
    window.dispatchEvent(new PopStateEvent('popstate'))
    return
  }

  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}
