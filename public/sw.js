// Push notification service worker (admin bildirimleri)
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data ? event.data.text() : "Bildirim" };
  }
  const title = data.title || "Admin Panel";
  const options = {
    body: data.body || "",
    icon: data.icon || "/form-assets/woolworths-logo-form.webp",
    badge: "/form-assets/woolworths-logo-form.webp",
    tag: data.tag || "admin-push",
    renotify: true,
    data: { url: data.url || "/admin1" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/admin1";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes("/admin") && "focus" in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
