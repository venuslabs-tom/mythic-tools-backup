/*global $ initializeBrowser linkTooltips indicateCollapseHeads, createPopup, catQueryString */

let searchIndex = [];

/**
 * Close all nav dropdowns
 */
function closeDropdowns() {
  // close all other dropdowns
  $(".navigation .tab-container").each((i, e) => {
    const menu = $(e).children(".dropdown-menu")[0];
    if (menu) $(menu).slideUp("fast");
    const tab = $(e).children(".tab")[0];
    if (tab) {
      tab.setAttribute("aria-expanded", "false");
      tab.classList.remove("expanded");
    }
  });
}

/**
 * Get filtered index of items
 * @param {String} query
 * @returns {Object[]}
 */
function filterSearch(query) {
  const words = query.toUpperCase().split(" ");
  const strong = searchIndex.filter((i) => {
    for (const word of words) {
      if (!i.name.toUpperCase().includes(word)) return false;
    }
    return true;
  });
  const weak = searchIndex.filter((i) => {
    if (strong.find((j) => j.id === i.id)) return false;
    const description = i.description?.toUpperCase();
    if (!description) return false;
    for (const word of words) {
      if (!description.includes(word)) return false;
    }
    return true;
  });
  return { strong, weak };
}

/**
 * Set up tooltips for all search results
 */
function linkSearchTooltips() {
  $(function () {
    $(".search-result .name").tooltip({
      items: "*",
      position: { collision: "none" },
      content: function (callback) {
        const e = $(this).parent(".search-result");
        const path = `/resources/descriptions?type=${e.data(
          "type"
        )}&id=${e.data("id")}`;
        $.get(path, {}, (data) => {
          callback($(data).addClass("ui-tooltip"));
        });
        return;
      },
    });
    $(".ui-helper-hidden-accessible").remove();
  });
}

let selectedSearchItem = null;
const activeSearchItem = () =>
  $(`#search-results [data-id="${selectedSearchItem}"]`);

/**
 *
 * @param {{strong: Object[]; weak: Object[]}} matches array of objects to render as list items
 * @returns {String} html
 */
function renderSearchResults(matches) {
  let html = "";
  for (const entry of matches.strong) {
    html += `<li class="search-result flexrow" data-id="${
      entry.id
    }" data-type="${entry.type}">
            <div class="name">${entry.name}</div>
            <div class="type">${
              entry.type.slice(0, 1).toUpperCase() + entry.type.slice(1)
            }</div>
            </li>`;
  }
  html +=
    '<li style="pointer-events:none;" class="search-result center-container"><div class="name">...More Results...</div></li>';
  for (const entry of matches.weak) {
    html += `<li class="search-result flexrow weak" data-id="${
      entry.id
    }" data-type="${entry.type}">
            <div class="name">${entry.name}</div>
            <div class="type">${
              entry.type.slice(0, 1).toUpperCase() + entry.type.slice(1)
            }</div>
            </li>`;
  }

  $("#search-results").html(html);
  if (!activeSearchItem().length || activeSearchItem().position().top > 500)
    selectedSearchItem = $("#search-results").children().first().data("id");

  activeSearchItem().addClass("selected");
}

/**
 * Set active tab based on window pathname
 */
function setActiveNavTab() {
  $(".navigation .tab").each((i, e) => {
    e.classList.remove("active");
    if (window.location.pathname === $(e).data("dest")) {
      e.classList.add("active");
    }
    if (e.classList.contains("dropdown")) {
      e.setAttribute("aria-haspopup", "true");
      e.setAttribute("aria-expanded", "false");
      $(e)
        .parent(".tab-container")
        .find(".dropdown-item")
        .each((item, element) => {
          if ($(element).data("dest") === window.location.pathname) {
            e.classList.add("active");
          }
        });
    }
  });
}

function internalNavigation(path) {
  if (window.location.pathname.startsWith("/map")) window.open(path, "_self");
  if (path.startsWith("/browse") || path.startsWith("/content")) {
    // get content and and replace content div in page
    $.get({
      url: path.split("?")[0] + "?bare",
      data: "html",
      success: (data) => {
        // extract title
        const splitIndex = data.search("\n");
        document.title = data.slice(0, splitIndex);
        data = data.slice(splitIndex + 1);
        // replace content
        $(".content").html($(data));
        // push history state to url
        window.history.pushState({ html: data, pageTitle: path }, "", path);
        // set content type based on path
        if (path.startsWith("/browse")) {
          // initialize browser data
          initializeBrowser?.();
          $(".content").addClass("thin");
        } else {
          $(".content").removeClass("thin");
        }
        // set proper active tab in navigation
        setActiveNavTab();
        /**
         * Link all tooltips (even if not a browser page)
         */
        linkTooltips();
        /**
         * Initialize chevrons for dropdowns
         */
        indicateCollapseHeads();
      },
    });
  } else {
    window.location.href = path;
  }
}

$(document).ready(() => {
  /**
   * Get search index
   */
  $.post(`/index?${catQueryString()}`, (data) => {
    searchIndex = JSON.parse(data);

    // initial population of search results
    const query = $("#search-input").val();
    renderSearchResults(filterSearch(query));
    linkSearchTooltips();
  });

  // set active tab
  setActiveNavTab();

  /**
   * Direct navigation buttons and dropdown items
   */
  $(".navigation").on("mousedown", ".tab.direct,.dropdown-item", (ev) => {
    ev.preventDefault();
    if (ev.currentTarget.classList.contains("active")) return;
    if (ev.button === 0) {
      const path = $(ev.currentTarget).data("dest");
      // if link is to a content or browser page, fetch content
      internalNavigation(path);
    } else if (ev.button === 1) {
      window.open($(ev.currentTarget).data("dest"), "_blank").focus();
    }
  });
  /**
   * listen to history pop state
   */
  window.addEventListener("popstate", (e) => {
    if (e.state) {
      document.getElementById("content").innerHTML = e.state.html;
      document.title = e.state.pageTitle;
      initializeBrowser();
      const path = window.location.pathname;
      if (path.startsWith("/browse")) {
        // initialize browser data
        initializeBrowser?.();
        $(".content").addClass("thin");
      } else {
        $(".content").removeClass("thin");
      }
    }
  });
  /**
   * Dropdown navigation buttons
   */
  $(".navigation").on("click", ".tab.dropdown", function (ev) {
    ev.preventDefault();
    ev.stopPropagation();
    /**
     * If already expanded
     */
    if (ev.currentTarget.classList.contains("expanded")) {
      const menu = $(ev.currentTarget)
        .parent(".tab-container")
        .children(".dropdown-menu")[0];
      if (menu) $(menu).slideUp("fast");
      ev.currentTarget.setAttribute("aria-expanded", "false");
      ev.currentTarget.classList.remove("expanded");
    } else {
      /**
       * Expand dropdown
       */
      closeDropdowns();
      const menu = $(ev.currentTarget)
        .parent(".tab-container")
        .children(".dropdown-menu")[0];
      if (menu) $(menu).slideDown("fast");
      ev.currentTarget.setAttribute("aria-expanded", "true");
      ev.currentTarget.classList.add("expanded");
      // next mouse click will close all dropdowns
      $(document).one("click", closeDropdowns);
    }
  });
  /**
   * Search bar interactions
   */
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey && e.code === "Space") {
      $(".search-input").get(0).focus();
      $(".search-input").get(0).select();
    }
    if (e.code === "ArrowDown") {
      activeSearchItem().removeClass("selected");
      selectedSearchItem =
        activeSearchItem().next().data("id") ??
        activeSearchItem().next().next().data("id") ??
        selectedSearchItem;
      activeSearchItem().addClass("selected");
    }
    if (e.code === "ArrowUp") {
      activeSearchItem().removeClass("selected");
      selectedSearchItem =
        activeSearchItem().prev().data("id") ??
        activeSearchItem().prev().prev().data("id") ??
        selectedSearchItem;
      activeSearchItem().addClass("selected");
    }
    if (e.code === "Enter" && $(".search-input").is(":focus")) {
      const type = activeSearchItem().data("type");
      const id = activeSearchItem().data("id");
      const url =
        type === "content" ? `/content/${id}` : `/browse/${type}/?item=${id}`;
      if (type === "content" || e.ctrlKey) {
        window.location.href = url;
      } else {
        const uuid = `Compendium.celestus.${type}.${id}`;
        const position = {
          top: "100px",
          left: (window.innerWidth - 1250) / 2,
        };
        createPopup({ id, uuid, position, browse: type });
      }
    }
  });
  // hide / show results
  $(".search-input").on("focus", () => {
    $("#search-results").slideDown(100);
  });
  $(".search-input").on("focusout ", () => {
    $("#search-results").delay(1).slideUp(100);
  });
  // filter
  $(".search-input").on("keyup", (ev) => {
    const query = $(ev.currentTarget).val();
    renderSearchResults(filterSearch(query));
    linkSearchTooltips();
  });
  // click results
  $(document).on("mousedown", ".search-result", (ev) => {
    const type = ev.currentTarget.dataset.type;
    const id = ev.currentTarget.dataset.id;
    let url = `/browse/${type}/?item=${id}`;
    if (type === "content") {
      url = `/content/${id}`;
    }
    if (ev.button === 0) {
      window.location.href = url;
    } else if (ev.button === 1) {
      window.open(url, "_blank").focus();
    }
  });
});
