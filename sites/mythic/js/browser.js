/*global $, byString, createForm, linkTooltips, updateURLParameter, removeURLParameter, catQueryString */
/* exported logFilterEncoded */

var domList;
var listItems;
var items = new Map();

const FILTER_VERSION = "1.0";

let pathname, filtersID, orderKeyID, orderAscending, filterVersion;
let pageIndex = "";

/**
 * Outputs the current filter for this page as an encoded url
 * path that, when visited will automatically set the filter to
 * the one stored in this client's cookies
 */
function logFilterEncoded() {
  console.info(
    window.location.pathname +
      "?filter=" +
      encodeURIComponent(localStorage.getItem(filtersID))
  );
}

/**
 * Sets all variables needed in order to get the names for associated cookies with this page
 */
function prepCookieParams() {
  pathname = window.location.pathname.split("/");
  pageIndex = "";
  while (pageIndex === "") {
    pageIndex = pathname.pop();
  }
  filtersID = `${pageIndex}-searchFilters`;
  orderKeyID = `${pageIndex}-orderKey`;
  orderAscending = `${pageIndex}-orderAscending`;
  filterVersion = `${pageIndex}-filterVersion`;
}

/**
 * renders minimize/maximize button on description
 */
function renderSizeControl() {
  $(".size-ctrl").remove();
  if ($("#description").hasClass("maximized")) {
    $("#description").append(
      '<i class="fa-solid fa-down-left-and-up-right-to-center size-ctrl"></i>'
    );
  } else {
    $("#description").append(
      '<i class="fa-solid fa-up-right-and-down-left-from-center size-ctrl"></i>'
    );
  }
}

/**
 * Selects an item from browser list and displays its description
 * @param {Object} target DOM object
 */
async function selectItem(target) {
  // fetch items data
  try {
    const response = await fetch(
      `/resources/descriptions?type=${pageIndex}&id=${$(target).attr("id")}`
    );
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    const html = await response.text();
    document.getElementById("description").innerHTML = html;
    renderSizeControl();

    // update url
    const name = $(target).data("name");
    document.title = name;
    window.history.pushState(
      `Celestus | ${pageIndex} | ${name}`,
      name,
      `${window.location.pathname}?item=${$(target).attr("id")}`
    );

    // mark item as selected
    $.each(listItems, function (idx, itm) {
      itm.classList.remove("selected");
    });
    target.classList.add("selected");

    // link tooltips
    linkTooltips();
  } catch (error) {
    console.error(error);
  }
}

/**
 * Initializes browser data and does first filter and select
 */
async function initializeBrowser() {
  // only init browser if it is an actual browser page
  if (!window.location.pathname.startsWith("/browse")) return;
  prepCookieParams();

  if (!localStorage.getItem(filtersID)) {
    localStorage.setItem(filtersID, "[]");
  }
  if (localStorage.getItem(filterVersion) !== FILTER_VERSION) {
    localStorage.setItem(filtersID, "[]");
    localStorage.setItem(filterVersion, FILTER_VERSION);
  }
  if (!localStorage.getItem(orderKeyID))
    localStorage.setItem(orderKeyID, "name");
  if (!localStorage.getItem(orderAscending))
    localStorage.setItem(orderAscending, true);

  // fetch items data
  try {
    const response = await fetch(
      `/resources/browserdata/${pageIndex}?${catQueryString()}`
    );
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    const array = await response.json();
    items = new Map(array.map((obj) => [obj._id, obj]));
  } catch (error) {
    console.error(error);
  }

  // get items list element
  domList = document.getElementById("item-list");
  listItems = $(domList).children("li").get();

  // check if site was sent filter data
  const urlParams = new URLSearchParams(window.location.search);
  const filter = urlParams.get("filter");
  if (filter) {
    localStorage.setItem(filtersID, filter);
  }

  // set selected filter as selected
  $(".list-header label").each((index, e) => {
    if ($(e).data("sort") === localStorage.getItem(orderKeyID)) {
      $(e).attr("data-selected", "true");
      $(e).attr(
        "data-direction",
        localStorage.getItem(orderAscending) === "true" ? "up" : "down"
      );
    }
  });
  // filter list
  populateList();

  // select first item if not already selecting an item
  const params = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
  });
  const ID = params.item;
  if (!ID) {
    const first = $(domList).children("li").get()[0];
    if (first) {
      selectItem(first);
    }
  }
  if (params.expanded === "true") maxDescription();
  renderSizeControl();

  // link tooltips
  linkTooltips();
}

/**
 * Displays list of filters in filters
 * @param {Object} filters to display
 */
function displayFilters(filters) {
  let html = "";
  if (!filters.length) return $(".filter-items").css({ display: "none" });
  for (const filter of filters) {
    for (const value of filter.values) {
      html += `<li class="filter-item" data-id="${value.id}" data-value=${value.value}>${value.label}</li>`;
    }
  }
  $(".filter-items").html(html);
  $(".filter-items").css({ display: "" });
}

function removeFilterItem(id, value) {
  if (typeof (id ?? value) === "undefined") return;
  const filters = JSON.parse(localStorage.getItem(filtersID)).data;
  if (!filters) return;
  for (const filter of filters) {
    let i = 0;
    for (const v of filter.values) {
      if (v.id === id && String(v.value) == String(value)) {
        filter.values.splice(i, 1);
        localStorage.setItem(filtersID, JSON.stringify({ data: filters }));

        return;
      }
      i++;
    }
  }
  console.warn("Could not find filter to remove");
}

/**
 * Hide browser and maximize description
 */
function maxDescription() {
  $("#description").addClass("maximized");
  window.history.replaceState(
    "",
    "",
    updateURLParameter(window.location.href, "expanded", "true")
  );
}
/**
 * minimize description and show browser
 */
function minDescription() {
  $("#description").removeClass("maximized");
  window.history.replaceState(
    "",
    "",
    removeURLParameter(window.location.href, "expanded")
  );
}

$(document).ready(async () => {
  // initialize browser data
  await initializeBrowser();

  // show skill description when clicking on a skill
  $(document).on("click", ".browser-item", (ev) => {
    selectItem(ev.currentTarget);
  });

  // filter items by search text
  $(document).on("keyup", "#list-input", (ev) => {
    populateList($(ev.currentTarget).val());
  });

  // set sorting attribute
  $(document).on("click", ".list-header label", (ev) => {
    // if already selected, change direction, otherwise set to up
    if (
      $(ev.currentTarget).attr("data-sort") === localStorage.getItem(orderKeyID)
    ) {
      if (localStorage.getItem(orderAscending) === "true") {
        localStorage.setItem(orderAscending, "false");
      } else {
        localStorage.setItem(orderAscending, "true");
      }
    } else {
      localStorage.setItem(orderAscending, "true");
    }

    // set element as selected
    $(".list-header label").each((index, e) => {
      $(e).attr("data-selected", "");
      $(e).attr("data-direction", "");
    });
    $(ev.currentTarget).attr("data-selected", "true");
    $(ev.currentTarget).attr(
      "data-direction",
      localStorage.getItem(orderAscending) === "true" ? "up" : "down"
    );

    // set localStorage var and repopulate
    localStorage.setItem(orderKeyID, $(ev.currentTarget).data("sort"));
    populateList();
  });

  /**
   * Open up filter form and turn form input into filter data
   */
  $(document).on("click", ".filter-button", async () => {
    await createForm(
      `/resources/forms/filter-${pageIndex}.hbs`,
      {
        listeners: (form) => {
          const controls = form.elements;
          const filters =
            JSON.parse(localStorage.getItem(filtersID)).data ?? [];
          for (const control of controls) {
            const filter = filters.find((f) =>
              f.values.find((v) => v.id === control.dataset.field)
            );
            if (filter?.values.find((v) => v.value === control.dataset.value)) {
              control.checked = true;
            }
          }
        },
      },
      (b, f) => {
        const filters = [];
        let i = 0;
        // merge fields
        for (const field of f) {
          const name = field.dataset.field;
          if (!name) continue;
          // check value
          let value = null;
          if (field.type === "checkbox") {
            if (!field.checked) continue;
            value = field.dataset.value;
          }
          if (!value) continue;
          const groupName =
            $(field).parents(".form-section").first().attr("name") ?? i++;
          const filterData = {
            id: name,
            value: value,
            inverted: false,
            label: $(field).data("name"),
          };
          const filter = filters.find((f) => f.name === groupName);
          if (filter) {
            filter.values.push(filterData);
          } else {
            filters.push({
              name: groupName,
              mode: "or",
              values: [filterData],
            });
          }
        }

        localStorage.setItem(filtersID, JSON.stringify({ data: filters }));
        populateList();
      }
    );
  });

  $(document).on("click", ".filter-item", (ev) => {
    removeFilterItem(
      $(ev.currentTarget).data("id"),
      $(ev.currentTarget).data("value")
    );
    populateList();
  });

  $(document).on("click", ".log-filter", logFilterEncoded);

  /**
   * Description size controls
   */
  $(document).on("click", "#description .size-ctrl", () => {
    if ($("#description").hasClass("maximized")) {
      minDescription();
    } else {
      maxDescription();
    }
    renderSizeControl();
  });
});

/**
 * Reorders items list
 * @param {String} sortBy data id to sort by
 * @param {Boolean?} ascending
 */
function orderSkills(attribute, ascending = true) {
  listItems.sort((a, b) => {
    if (ascending) {
      if ($(a).data(attribute) < $(b).data(attribute)) return -1;
      if ($(a).data(attribute) > $(b).data(attribute)) return 1;
      if ($(a).data("name") < $(b).data("name")) return -1;
      return 1;
    } else {
      if ($(a).data(attribute) > $(b).data(attribute)) return -1;
      if ($(a).data(attribute) < $(b).data(attribute)) return 1;
      if ($(a).data("name") < $(b).data("name")) return -1;
      return 1;
    }
  });

  $.each(listItems, function (idx, itm) {
    domList.append(itm);
  });
}

/**
 * Filters the browser list by a string
 * @param {String} text to filter by
 */
function filterByText(text) {
  text = text.toUpperCase();
  // populate list
  $.each(listItems, function (idx, itm) {
    if (!$(itm).data("name").toUpperCase().includes(text)) $(itm).detach("li");
  });
}

/**
 * Filters by an array of fields and values
 * @param {Object[]} filters array of field and filter options
 *      keys[{id: String, value: any}],
 *      mode ("and","or")
 */
function filterByParams(filters) {
  if (!filters?.length) return;
  // populate list
  $("#item-list")
    .children("li")
    .each(function (idx, itm) {
      // check filters
      let valid = true;
      const item = items.get($(itm).attr("id"));
      for (const filter of filters) {
        if (filter.values?.length) {
          let currentValid = true;
          if (filter.mode === "and") {
            for (const value of filter.values) {
              currentValid =
                (String(byString(item, value.id)) == value.value) ===
                !value.inverted;
              if (!currentValid) break;
            }
          } else if (filter.mode === "or") {
            for (const value of filter.values) {
              const v = byString(item, value.id);
              currentValid = false;
              if (Array.isArray(v)) {
                if (v.includes(value.value) === !value.inverted) {
                  currentValid = true;
                  break;
                }
              } else {
                if ((value.value == String(v)) === !value.inverted) {
                  currentValid = true;
                  break;
                }
              }
            }
          }
          if (!currentValid) {
            valid = false;
            break;
          }
        }
      }
      if (!valid) {
        // remove item from list
        $(itm).detach();
      }
    });
}

/**
 * Populates browser list
 * @param {String} textFilter
 */
function populateList(textFilter = null) {
  textFilter ??= document.getElementById("list-input").value;
  orderSkills(
    localStorage.getItem(orderKeyID),
    localStorage.getItem(orderAscending) === "true"
  );
  const filters = JSON.parse(localStorage.getItem(filtersID)).data ?? [];
  // record total number of browser items
  const totalItems = $("#item-list li").length;
  filterByParams(filters);
  displayFilters(filters);
  filterByText(textFilter);
  // record number of post-filtered items
  const filteredItems = $("#item-list li").length;
  $(".filter-total").html(`${filteredItems}/${totalItems}`);
}
