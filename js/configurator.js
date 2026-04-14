/*global $, UI, setCookie, getCookie */

function configurate() {
  const ctypes = JSON.parse(getCookie("ctypes") ?? "[]");
  UI.Confirm(
    "Configurator",
    `
    <div class="form-fields">
      <b>NOTE: These features are all inactive/experimental</b>
      <div class="form-field">
        <label for="homebrew">Enable homebrew</label>
        <input type="checkbox" class="form-input" name="homebrew"
         ${ctypes.includes("homebrew") ? "checked" : ""}>
      </div>
      <div class="form-field">
        <label for="secret">Secret code</label>
        <input type="password" class="form-input" name="secret">
      </div>
    </div>`,
    {
      confirm: (data) => {
        // update content types cookie
        const ctypes = JSON.parse(getCookie("ctypes") ?? "[]");
        if (data.get("homebrew")) {
          if (!ctypes.includes("homebrew")) ctypes.push("homebrew");
        } else if (ctypes.includes["hombrew"]) {
          const index = ctypes.indexOf("homebrew");
          if (index > -1) ctypes.splice(index, 1);
        }
        console.log(ctypes);
        setCookie("ctypes", JSON.stringify(ctypes), 365 * 5);
        if (data.get("secret")) {
          $.post("/auth", { pass: data.get("secret") }, () => {
            window.location.reload();
          });
        }
      },
    }
  );
}

$(document).ready(() => {
  $(document).on("click", ".config-button", configurate);
});
