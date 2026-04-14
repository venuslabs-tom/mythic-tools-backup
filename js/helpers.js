/* eslint-disable no-unused-vars */
/* global $ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * creates a cookie
 * @param {string} name
 * @param {any} value
 * @param {number} days
 */
function setCookie(name, value, days) {
  var expires = "";
  if (days) {
    var date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
}
/**
 * gets the value of a cookie
 * @param {string} name
 * @returns {any}
 */
function getCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(";");
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}
/**
 * deletes a cookie
 * @param {string} name
 */
function eraseCookie(name) {
  document.cookie = name + "=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
}

/**
 * Generate string for requests that includes what categories are valid
 * @returns {string} query for uri
 */
function catQueryString() {
  const ctypes = JSON.parse(getCookie("ctypes") ?? "[]");
  return `ctypes=${encodeURIComponent(JSON.stringify(ctypes))}`;
}

function linkTooltips() {
  $(function () {
    $("a.content-link").tooltip({
      items: "*",
      position: { collision: "none", my: "left top", at: "left bottom" },
      content: function (callback) {
        const e = $(this);
        // find which browser the item belongs to
        const regex = /(?<=celestus.).+(?=\.)/;
        const browse = regex.exec(e.data("uuid"))?.[0] ?? "";
        // check if page is 404
        const path = `/resources/descriptions?type=${browse}&id=${e.data(
          "id"
        )}`;
        $.get(path, {}, (data) => {
          callback(
            $(data).addClass("ui-tooltip").addClass("content-description")
          );
        });
        return;
      },
    });
    $(".ui-helper-hidden-accessible").remove();
  });
}

/**
 * Indicates wether a collapse-header is dropped down or not
 * @param {Element} e DOM element to indicate
 * @param {?Boolean} override boolean to not check target and just change icon
 */
function indicateCollapse(e, override = null) {
  if (override !== null) {
    $(e)
      .find(".collapse-indicator")
      .each((i, e) => $(e).remove());
    let html = e.innerHTML.trimStart();
    if (override) {
      e.innerHTML =
        '<i class="fa-solid fa-circle-chevron-down collapse-indicator"></i>' +
        html;
    } else {
      e.innerHTML =
        '<i class="fa-solid fa-circle-chevron-right collapse-indicator"></i>' +
        html;
    }
    return;
  }
  // find corresponding collapse section
  const target = document.getElementById($(e).data("for"));
  if (target) {
    // remove any existing indicators
    $(e)
      .find(".collapse-indicator")
      .each((i, e) => $(e).remove());
    let html = e.innerHTML.trimStart();
    // check if target is expanded
    const expanded = target.classList.contains("active");
    if (expanded) {
      e.innerHTML =
        '<i class="fa-solid fa-circle-chevron-down collapse-indicator"></i>' +
        html;
    } else {
      e.innerHTML =
        '<i class="fa-solid fa-circle-chevron-right collapse-indicator"></i>' +
        html;
    }
  }
}

/**
 * Set collapse indicators on all h1.collapse-header elements
 */
function indicateCollapseHeads() {
  $("h1.collapse-header,h2.collapse-header").each((i, e) => {
    indicateCollapse(e);
  });
}

/**
 *
 * @param {{
 *  position: {top: number, left: number},
 *  uuid: string,
 *  id: string,
 *  browse: string
 * }} options
 */
async function createPopup(options) {
  const { position, uuid, id, browse } = options;
  const path = `/browse/${browse}/?item=${id}`;
  // remove any existing windows
  await $(document.getElementById(uuid)).remove();
  const promise = new Promise(function (resolve) {
    const descriptionPath = `/resources/descriptions?type=${browse}&id=${id}`;
    $.get(descriptionPath, {}, (data) => {
      resolve($(data));
    });
    return;
  });
  const description = await promise;
  const popout = $(`<div class="popout" id="${uuid}">
                    <div class="popout-head">
                        <div class="popout-name">
                            <a class="copy-text" data-text="${
                              window.location.origin
                            }${path}" title="Copy URL to keyboard">
                                <i class="fa-solid fa-book"></i>
                                ${
                                  browse[0].toUpperCase() + browse.slice(1)
                                }/${description.find(".title").text()}
                            </a>
                        </div>
                        <div class="popout-buttons">
                            <a class="expand-popout" title="Open page" href="${path}">
                                <i class="fa-solid fa-expand"></i>
                            </a>
                            <a class="open-popout-link" title="Open In New Tab" data-path="${
                              window.location.origin
                            }${path}">
                                <i class="fa-solid fa-up-right-from-square"></i>
                            </a>
                            <a class="exit-popout" title="Close Popup">
                                <i class="fa-solid fa-xmark"></i>
                            </a>
                        </div>
                    </div>
                </div>`);
  popout.append(description);
  popout.modal();
  popout.draggable({
    cancel: ".description",
    scroll: false,
    contain: "#overlay",
    start: (ev) => $("#overlay").append($(ev.currentTarget)),
  });
  popout.css({ top: position.top, left: position.left });
  $("#overlay").append(popout);
  $(`#${uuid} a`).tooltip();
  linkTooltips();
}

$(document).ready(() => {
  /**
   * Load email address
   */
  $(".contact-me").each(function () {
    $(this).attr("href", "mailto:the.tool@outlook.com");
    $(this).html("the.tool@outlook.com");
  });

  $(document).tooltip({
    position: { my: "center top", at: "center bottom" },
  });
  /**
   * Link all tooltips (even if not a browser page)
   */
  linkTooltips();
  /**
   * Initialize chevrons for dropdowns
   */
  indicateCollapseHeads();
  /**
   * Link all content-links
   */
  $(document).on("mousedown", ".content-link", async (ev) => {
    ev.preventDefault();
    // find which browser the item belongs to
    const regex = /(?<=celestus.).+(?=\.)/;
    const browse = regex.exec(ev.currentTarget.dataset.uuid)?.[0] ?? "";
    // check if page is 404
    const path = `/browse/${browse}/?item=${ev.currentTarget.dataset.id}`;
    try {
      await $.get(path);
    } catch {
      return console.error("Error: Linked Content does not exist on server.");
    }
    const e = $(ev.currentTarget);
    const parent = $(
      e.closest(".item-display")[0] ??
        e.closest(".popout")[0] ??
        e.closest(".content")[0]
    );

    if (ev.button === 0) {
      const parentPosition = parent.position();
      const position = e.position();
      const uuid = e.data("uuid");
      const id = e.data("id");
      position.top += parentPosition.top + e.height();
      position.left += parentPosition.left;
      await createPopup({ position, uuid, id, browse });
    } else if (ev.button === 1) {
      window.open(path, "_blank").focus();
    }
  });
  /**
   * Exit popouts
   */
  $(document).on("click", ".exit-popout", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    $(ev.currentTarget)
      .closest(".popout")
      .slideUp(150, function () {
        $(this).remove();
      });
  });
  /**
   * Open popup in new tab
   */
  $(document).on("click", ".open-popout-link", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    window.open($(ev.currentTarget).data("path"), "_blank").focus();
  });
  /**
   * When click on popout, move to top
   */
  $(document).on("click", ".popout .popout-head", (ev) => {
    // ignore if clicking on a content link
    const classes = ev.currentTarget.classList;
    if (classes.contains("content-link") || classes.contains("exit-popout"))
      return false;
    $("#overlay").append($(ev.currentTarget).parents(".popout"));
  });
  /**
   * Collapsible headers
   */
  $(document).on("click", ".collapse-header", async (ev) => {
    const id = ev.currentTarget.dataset.for;
    const section = document.getElementById(id);
    if (section.classList.contains("active")) {
      $(section).slideUp("fast", () => {
        if ($(ev.currentTarget).find(".collapse-indicator")) {
          indicateCollapse(ev.target, false);
        }
        section.classList.remove("active");
      });
    } else {
      $(section).slideDown("fast", () => {
        if ($(ev.currentTarget).find(".collapse-indicator")) {
          indicateCollapse(ev.target, true);
        }
        section.classList.add("active");
      });
    }
  });
  /**
   * Copy text on click of a.copy-text
   */
  $(document).on("click", ".copy-text", (ev) => {
    ev.preventDefault();
    navigator.clipboard.writeText($(ev.currentTarget).data("text"));
  });
});

/**
 * Activates listeners like button toggles on form
 * @param {Object} html dom element form
 */
function activateFormListeners(html) {}

/**
 * Creates a form and awaits it's submission
 * @param {String} url to template
 * @param {Object?} options
 * @param {Function(Button, Object)} callback
 * @returns {Promise | Boolean} FormData
 */
async function createForm(url, options = {}, callback = () => {}) {
  try {
    if ($(".popup-form").length) return false;
    // get html
    const request = await fetch(url);
    if (!request.ok) throw new Error(request.status);
    const html = await request.text();

    // create element
    const form = document.createElement("form");
    form.classList.add("popup-form");
    form.innerHTML = html;
    const overlay = document.createElement("div");
    overlay.classList.add("form-overlay");

    // add form to document
    document.body.appendChild(overlay);
    document.body.appendChild(form);

    activateFormListeners(form);
    if (typeof options.listeners === "function") {
      options.listeners(form);
    }

    return new Promise((resolve, reject) => {
      $(form).on("submit", (ev) => {
        ev.preventDefault();
        const data = new FormData(form);

        // process data for callback
        const fields = {};
        const controls = form.elements;
        for (let i = 0; i < controls.length; i++) {
          if (controls[i].nodeName === "INPUT") {
            fields[controls[i].name] = controls[i];
          }
        }
        callback($(document.activeElement)[0], controls);

        form.remove();
        overlay.remove();
        resolve(data);
      });
    });
  } catch (error) {
    console.error(error);
    return {};
  }
}

/**
 * Access nested object variable from string
 * by Ray Bellis
 * https://stackoverflow.com/a/6491621/23494595
 * @param {Object} o
 * @param {String} s
 * @returns
 */
function byString(o, s) {
  s = s.replace(/\[(\w+)\]/g, ".$1"); // convert indexes to properties
  s = s.replace(/^\./, ""); // strip a leading dot
  var a = s.split(".");
  for (var i = 0, n = a.length; i < n; ++i) {
    var k = a[i];
    if (k in o) {
      o = o[k];
    } else {
      return;
    }
  }
  return o;
}

/**
 * Visit all descendants and execute callback function
 * Snippet by T.J. Crowder @ https://web.archive.org/web/20250220052958/https://stackoverflow.com/questions/66281903/iterate-through-all-children-and-children-children-of-an-object/66282012#66282012
 * @param {Object} obj
 * @param {Function} callback
 * @param {String} path
 */
function visitDescendants(obj, callback, path = "") {
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === "object") {
      // Recurse
      path = path === "" ? key : path + "." + key;
      visitDescendants(value, callback, path);
    } else {
      callback(key, value, path);
    }
  }
}

/**
 * Jquery plugin to allow listening to enter press from input
 */
$.fn.pressEnter = function (fn) {
  return this.each(function () {
    $(this).bind("enterPress", fn);
    $(this).keyup(function (e) {
      if (e.keyCode == 13) {
        $(this).trigger("enterPress");
      }
    });
  });
};

/**
 * http://stackoverflow.com/a/10997390/11236
 */
function updateURLParameter(url, param, paramVal) {
  var newAdditionalURL = "";
  var tempArray = url.split("?");
  var baseURL = tempArray[0];
  var additionalURL = tempArray[1];
  var temp = "";
  if (additionalURL) {
    tempArray = additionalURL.split("&");
    for (var i = 0; i < tempArray.length; i++) {
      if (tempArray[i].split("=")[0] != param) {
        newAdditionalURL += temp + tempArray[i];
        temp = "&";
      }
    }
  }

  var rows_txt = temp + "" + param + "=" + paramVal;
  return baseURL + "?" + newAdditionalURL + rows_txt;
}
function removeURLParameter(url, param) {
  var newAdditionalURL = "";
  var tempArray = url.split("?");
  var baseURL = tempArray[0];
  var additionalURL = tempArray[1];
  var temp = "";
  if (additionalURL) {
    tempArray = additionalURL.split("&");
    for (var i = 0; i < tempArray.length; i++) {
      if (tempArray[i].split("=")[0] != param) {
        newAdditionalURL += temp + tempArray[i];
      }
    }
  }
  return baseURL + "?" + newAdditionalURL;
}
