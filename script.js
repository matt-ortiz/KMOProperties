const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelectorAll(".site-nav a, .nav-cta");
const year = document.querySelector("[data-year]");
const contactForm = document.querySelector("[data-contact-form]");
let formNote = document.querySelector("[data-form-note]");
const valuationForm = document.querySelector("[data-valuation-form]");
const valuationNote = document.querySelector("[data-valuation-note]");
const personalCmaButton = document.querySelector("[data-personal-cma]");
const listingsWidget = document.querySelector("[data-listings-widget]");
const listingsGrid = document.querySelector("[data-listings-grid]");
const listingsStatus = document.querySelector("[data-listings-status]");
const listingFilterButtons = document.querySelectorAll("[data-listings-filter]");
const MAX_VISIBLE_LISTINGS = 6;

if (year) {
  year.textContent = new Date().getFullYear();
}

const syncHeader = () => {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 20);
};

syncHeader();
window.addEventListener("scroll", syncHeader, { passive: true });

if (menuToggle && header) {
  menuToggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    if (!header || !menuToggle) return;
    header.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const formatInteger = (value) => {
  const number = Number(value);
  if (!number) return "";
  return new Intl.NumberFormat("en-US").format(number);
};

const getListingUrl = (url) => {
  const value = String(url || "");
  if (value.startsWith("/")) return `https://kellieortiz.samsonproperties.net${value}`;
  return value;
};

const listingFilters = {
  featured: {
    label: "featured homes",
    test: () => true,
    sort: (a, b) => Number(b.isNorthernVirginia) - Number(a.isNorthernVirginia) || a.feedRank - b.feedRank
  },
  "just-listed": {
    label: "just listed homes",
    test: (listing) => listing.statusLabel === "Just Listed",
    sort: (a, b) => a.feedRank - b.feedRank
  },
  "open-house": {
    label: "open houses",
    test: (listing) => listing.statusLabel === "Open House",
    sort: (a, b) => Number(b.isNorthernVirginia) - Number(a.isNorthernVirginia) || a.feedRank - b.feedRank
  },
  nova: {
    label: "Northern Virginia homes",
    test: (listing) => Boolean(listing.isNorthernVirginia),
    sort: (a, b) => a.feedRank - b.feedRank
  },
  "under-1m": {
    label: "homes under $1M",
    test: (listing) => Number(listing.price) > 0 && Number(listing.price) <= 1000000,
    sort: (a, b) => Number(b.isNorthernVirginia) - Number(a.isNorthernVirginia) || a.feedRank - b.feedRank
  }
};

const renderListingCard = (listing) => {
  const metaItems = [
    listing.beds ? `${listing.beds} bd` : "",
    listing.baths ? `${listing.baths} ba` : "",
    listing.sqft ? `${formatInteger(listing.sqft)} sqft` : ""
  ].filter(Boolean);

  return `
    <article class="listing-card" data-listing-card>
      <div class="listing-media">
        <img src="${escapeHtml(listing.image)}" alt="${escapeHtml(`${listing.address} in ${listing.city}, ${listing.state}`)}" loading="lazy" />
        <span class="listing-badge">${escapeHtml(listing.statusLabel || "Active")}</span>
        <span class="listing-price">${escapeHtml(listing.priceLabel || "Price on request")}</span>
      </div>
      <div class="listing-body">
        <span class="listing-type">${escapeHtml(listing.type)}</span>
        <h3>${escapeHtml(listing.address)}</h3>
        <address>${escapeHtml(`${listing.city}, ${listing.state} ${listing.zip}`)}</address>
        <ul class="listing-meta" aria-label="Property details">
          ${metaItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
        <a href="${escapeHtml(getListingUrl(listing.url))}" target="_blank" rel="noopener noreferrer">View Listing</a>
      </div>
    </article>
  `;
};

const setListingFilter = (filterName, listings) => {
  if (!listingsGrid || !listingsStatus) return;

  const filter = listingFilters[filterName] || listingFilters.featured;
  const matches = listings.filter(filter.test).sort(filter.sort);
  const visibleListings = matches.slice(0, MAX_VISIBLE_LISTINGS);

  listingFilterButtons.forEach((button) => {
    const isActive = button.dataset.listingsFilter === filterName;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  listingsStatus.textContent = matches.length
    ? `Showing ${visibleListings.length} ${filter.label} sorted by days on website.`
    : `No ${filter.label} matched the current curated feed.`;

  listingsGrid.innerHTML = visibleListings.length
    ? visibleListings.map(renderListingCard).join("")
    : '<div class="listing-empty"><p>Try another filter or view all listings for the full Samson Properties search.</p></div>';
};

const initListings = async () => {
  if (!listingsWidget || !listingsGrid || !listingsStatus) return;

  try {
    const response = await fetch("data/listings.json");
    if (!response.ok) throw new Error(`Listing feed returned ${response.status}`);

    const data = await response.json();
    const listings = Array.isArray(data.listings) ? data.listings : [];
    if (!listings.length) throw new Error("Listing feed is empty");

    setListingFilter("featured", listings);

    listingFilterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setListingFilter(button.dataset.listingsFilter || "featured", listings);
      });
    });
  } catch (error) {
    listingsStatus.textContent = "Listings are being refreshed. View all listings for the complete search.";
    listingsGrid.innerHTML =
      '<div class="listing-empty"><p>The curated listing feed could not load in this browser session.</p></div>';
  }
};

initListings();

const ensureFormNote = () => {
  if (formNote || !contactForm) return formNote;

  formNote = document.createElement("p");
  formNote.className = "form-note full";
  formNote.dataset.formNote = "";
  formNote.setAttribute("aria-live", "polite");
  contactForm.append(formNote);

  return formNote;
};

const getContactPayload = (form) => {
  const payload = {};

  new FormData(form).forEach((value, key) => {
    if (key.startsWith("_")) return;

    const fieldValue = typeof value === "string" ? value.trim() : value;
    if (!fieldValue) return;

    payload[key] = fieldValue;
  });

  return payload;
};

if (contactForm) {
  contactForm.addEventListener("submit", async (event) => {
    const statusNote = ensureFormNote();
    const action = contactForm.getAttribute("action") || "";
    if (action.includes("YOUR_FORMSPARK_ID")) {
      event.preventDefault();
      if (statusNote) {
        statusNote.textContent = "Add your Formspark form ID in index.html to turn on delivery.";
        statusNote.classList.remove("is-success");
        statusNote.classList.add("is-warning");
      }
      return;
    }

    if (!contactForm.checkValidity()) return;

    event.preventDefault();

    const submitButton = contactForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton?.textContent || "Send Message";

    if (statusNote) {
      statusNote.textContent = "Sending your message...";
      statusNote.classList.remove("is-success", "is-warning");
    }
    contactForm.classList.add("is-submitting");

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }

    try {
      const response = await fetch(action, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(getContactPayload(contactForm))
      });

      if (!response.ok) throw new Error(`Form returned ${response.status}`);

      contactForm.reset();
      if (statusNote) {
        statusNote.textContent = "Thank you. Your message was sent, and Kellie will follow up soon.";
        statusNote.classList.add("is-success");
      }
    } catch (error) {
      if (statusNote) {
        statusNote.textContent =
          "Something got in the way. Please call or email Kellie directly, and we will get this sorted out.";
        statusNote.classList.add("is-warning");
      }
    } finally {
      contactForm.classList.remove("is-submitting");
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    }
  });
}

const getValuationAddress = () => {
  if (!valuationForm) return null;

  const formData = new FormData(valuationForm);
  const streetAddress = String(formData.get("street_address") || "").trim().replace(/\s+/g, " ");
  const city = String(formData.get("city") || "").trim().replace(/\s+/g, " ");
  const state = String(formData.get("state") || "").trim().toUpperCase();
  const zip = String(formData.get("zip") || "").trim();

  if (!streetAddress || !city || !state || !zip) return null;

  const streetParts = streetAddress.match(/^(\d+)\s+(.+)$/);
  const number = streetParts ? streetParts[1] : "";
  const street = streetParts ? streetParts[2] : streetAddress;
  const fullAddress = `${streetAddress} ${city} ${state} ${zip}`;

  return { streetAddress, city, state, zip, number, street, fullAddress };
};

if (valuationForm && valuationNote) {
  valuationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const address = getValuationAddress();

    if (!address) {
      valuationNote.textContent = "Enter the full property address to open the estimate.";
      valuationNote.classList.add("is-warning");
      return;
    }

    const params = new URLSearchParams({
      quick: "1",
      geolocate: address.fullAddress,
      cma: "1",
      number: address.number,
      street: address.street,
      city: address.city,
      state: address.state,
      zip: address.zip,
      country: "",
      justintime: ""
    });

    window.open(`https://kellieortiz.samsonproperties.net/sell.php?${params.toString()}`, "_blank", "noopener");
    valuationNote.textContent = `Opening an instant estimate for ${address.fullAddress}.`;
    valuationNote.classList.remove("is-warning");
  });
}

if (personalCmaButton && contactForm) {
  personalCmaButton.addEventListener("click", () => {
    const address = getValuationAddress();
    const select = contactForm.querySelector('select[name="move_type"]');
    const textarea = contactForm.querySelector('textarea[name="message"]');

    if (select) select.value = "Selling";
    if (textarea) {
      textarea.value = address
        ? `I'd like a personal home valuation for ${address.fullAddress}.`
        : "I'd like a personal home valuation.";
    }

    document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => textarea?.focus(), 350);
  });
}

const COLLAPSED_TESTIMONIAL_HEIGHT = 178;
let testimonialResizeTimer;

const initTestimonials = () => {
  document.querySelectorAll(".testimonial-row article").forEach((article) => {
    const quote = article.querySelector("p");
    if (!quote) return;

    article.querySelector(".read-more-btn")?.remove();
    quote.classList.remove("is-collapsible", "is-expanded");

    if (quote.scrollHeight <= COLLAPSED_TESTIMONIAL_HEIGHT + 24) return;

    quote.classList.add("is-collapsible");

    const button = document.createElement("button");
    button.className = "read-more-btn";
    button.type = "button";
    button.setAttribute("aria-expanded", "false");
    button.textContent = "Read more";

    quote.insertAdjacentElement("afterend", button);

    button.addEventListener("click", () => {
      const isExpanded = quote.classList.toggle("is-expanded");
      button.setAttribute("aria-expanded", String(isExpanded));
      button.textContent = isExpanded ? "Read less" : "Read more";
    });
  });
};

initTestimonials();

if (document.fonts) {
  document.fonts.ready.then(initTestimonials);
}

window.addEventListener("resize", () => {
  window.clearTimeout(testimonialResizeTimer);
  testimonialResizeTimer = window.setTimeout(initTestimonials, 150);
});
