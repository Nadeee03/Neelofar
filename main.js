import { supabase } from '../utils/supabaseClient.js';

document.addEventListener("DOMContentLoaded", function () {

  const routerInfo = {
    "index.html": {
      page: "./index.html",
      title: "Home Page | Neelofar Online Library",
    },
    "request.html": {
      page: "./request.html",
      title: "Request | Neelofar Online Library",
    },
    "recommendations.html": {
      page: "./recommendations.html",
      title: "Recommendations | Neelofar Online Library",
    },
    "notes.html": {
      page: "./notes.html",
      title: "Notes | Neelofar Online Library",
    },
    "talks.html": {
      page: "./talks.html",
      title: "Talks | Neelofar Online Library",
    },
    "special.html": {
      page: "./special.html",
      title: "Special | Neelofar Online Library",
    },
    "podcast.html": {
      page: "./podcast.html",
      title: "Podcast | Neelofar Online Library",
    },
    "full-text-page.html": {
      page: "./full-text-page.html",
      title: "Full Text | Neelofar Online Library",
    },
    "about.html": {
      page: "./about.html",
      title: "About | Neelofar Online Library",
    }
  };

  const contentContainer = document.getElementById("main-content");
  const navLinks = document.querySelectorAll(".nav-link, .dropdown-content a");

  // Handle all navigation clicks including dropdown links
  document.addEventListener("click", e => {
    const link = e.target.closest("a");
    if (!link) return;

    // Only handle links with href starting with '#' or matching router keys or pages
    let href = link.getAttribute("href");

    // If href is missing or is external link, ignore
    if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

    e.preventDefault();

    // Remove leading '#' if present
    if (href.startsWith("#")) href = href.substring(1);

    // For links like 'request.html?province=...' ensure exact routing works
    window.history.pushState({ href }, "", `#${href}`);
    changePageContent(href);
  });

  // Core function to load content dynamically based on href (may include query)
  async function changePageContent(href) {
    // Separate page path and query string
    const [pagePath, queryString] = href.split("?");
    const route = routerInfo[pagePath] || routerInfo["index.html"];

    if (!route) {
      contentContainer.innerHTML = "<h2>Page not found</h2>";
      document.title = "404 | Single Page Application";
      return;
    }

    document.title = route.title;

    try {
      // Fetch page HTML
      const res = await fetch(route.page);
      const html = await res.text();

      // Parse HTML and extract main content (assuming #content-container is main container)
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const mainContent = doc.querySelector("#main-content") || doc.body;

      contentContainer.innerHTML = mainContent.innerHTML;

      // Scroll top on page load
      window.scrollTo(0, 0);

      // Special case for full-text-page.html: call fetchFullTextPage with full href
      if (pagePath === "full-text-page.html") {
        await fetchFullTextPage(href);
      }

      if (pagePath === "request.html") {
        const params = new URLSearchParams(queryString);
        const province = params.get("province");

        if (!province) {
          // Main link clicked — no province selected
          const requestsContainer = document.querySelector('.requests-container');
          const formSection = document.querySelector('.request-form-section');

          if (!requestsContainer || !formSection) return;

          let infoDiv = document.getElementById('province-info');
          if (!infoDiv) {
            infoDiv = document.createElement('div');
            infoDiv.id = 'province-info';
            requestsContainer.prepend(infoDiv);
          }

          infoDiv.innerHTML = `<h2>لطفاً یک ولایت را از منو انتخاب کنید.</h2>`;
          formSection.style.display = 'none';
        } else {
          // Sub link clicked — run province handler
          handleProvinceInfo(province);
        }
      }


      if (pagePath === "recommendations.html") {
        const params = new URLSearchParams(queryString);
        const category = params.get("category");
        if (category) {
          loadRecommendations(category);
        }
      }

      if (pagePath === "notes.html") fetchNotes();
      if (pagePath === "talks.html") fetchTalks();
      if (pagePath === "special.html") fetchSpecial();
      if (pagePath === "podcast.html") fetchPodcast();
      if (pagePath === "index.html" || pagePath === "home" || !pagePath) {
        await loadHomepageContent();
      }




      // Update active nav link classes
      updateActiveNavLink(pagePath);

    } catch (err) {
      console.error("❌ Error loading page:", err);
      contentContainer.innerHTML = "<h2>خطا در بارگیری صفحه</h2>";
    }
  }

  function updateActiveNavLink(activePage) {
    // Remove all active classes first
    navLinks.forEach(link => link.classList.remove("active"));

    // Find and set active class to matching nav link by href
    navLinks.forEach(link => {
      let href = link.getAttribute("href") || "";
      if (href.startsWith("#")) href = href.substring(1);
      if (href.split("?")[0] === activePage) {
        link.classList.add("active");
      }
    });
  }

  window.addEventListener("load", () => {
    const initialHref = window.location.hash ? window.location.hash.substring(1) : "index.html";
    changePageContent(initialHref);
  });

  window.addEventListener("popstate", (e) => {
    const fallback = window.location.hash ? window.location.hash.substring(1) : "index.html";
    const href = e.state?.href || fallback;
    changePageContent(href);
  });


  async function fetchFullTextPage() {
    const hash = location.hash.slice(1); // Remove the '#' from the start
    const [page, query] = hash.split("?");

    if (page !== "full-text-page.html") return;

    const params = new URLSearchParams(query);
    const bookId = params.get("id");

    if (!bookId) {
      document.querySelector(".full-text-main-content").innerHTML = "<p>آیتم یافت نشد.</p>";
      return;
    }

    let table = "latestContent";
    if (bookId.startsWith("talk")) table = "talks";
    else if (bookId.startsWith("book")) table = "notes";
    else if (bookId.startsWith("special")) table = "special";
    else if (bookId.startsWith("podcast")) table = "podcast";

    try {
      const { data: items, error } = await supabase
        .from(table)
        .select("*")
        .eq("id", bookId);

      if (error) throw error;

      const book = items[0];
      if (!book) {
        document.querySelector(".full-text-main-content").innerHTML = "<p>یافت نشد.</p>";
        return;
      }

      // Render content
      const titleElement = document.querySelector(".full-text-container h1");
      const imageElement = document.querySelector(".top-image");
      const detailsSection = document.querySelector(".book-details");
      const dateElement = document.querySelector(".date");
      const downloadLink = document.querySelector('.link');
      const audioElement = document.querySelector('.audio');

      if (titleElement) titleElement.textContent = book.title;
      if (imageElement) imageElement.src = book.image;
      if (dateElement) dateElement.textContent = book.date;

      if (downloadLink) {
        if (book.pdfLink) {
          downloadLink.href = book.pdfLink;
          downloadLink.textContent = "| دانلود فایل";
          downloadLink.style.display = "inline-block";
        } else {
          downloadLink.style.display = "none";
        }
      }

      if (audioElement) {
        if (book.audioLink) {
          audioElement.href = book.audioLink;
          audioElement.style.display = "inline-block";
        } else {
          audioElement.style.display = "none";
        }
      }

      if (detailsSection) {
        detailsSection.innerHTML = `
        <h2>${book.writer}</h2>
        <p>${book.content}</p>
      `;
      }

      // Related items
      const { data: relatedItems, error: relatedError } = await supabase
        .from(table)
        .select("*")
        .neq("id", bookId)
        .limit(4);

      if (relatedError) throw relatedError;

      const relatedContainer = document.querySelector(".related-content");
      relatedContainer.innerHTML = "";
      window.scrollTo({ top: 0, behavior: 'smooth' });

      relatedItems.forEach(item => {
        const div = document.createElement("div");
        div.className = "related-item";
        div.innerHTML = `
        <a href="#full-text-page.html?id=${item.id}">
          <img src="${item.image}" alt="${item.title}" />
          <p>${item.title}</p>
        </a>
      `;

        div.querySelector("a").addEventListener("click", function (e) {
          e.preventDefault();
          const newUrl = this.getAttribute("href");
          history.pushState({ href: newUrl }, "", `#${newUrl}`);
          fetchFullTextPage();
        });

        relatedContainer.appendChild(div);
      });

      loadLatestContentSidebar();

    } catch (err) {
      console.error("❌ Error loading full text from Supabase:", err);
      document.querySelector(".full-text-main-content").innerHTML = "<p>خطا در بارگیری محتوا</p>";
    }
  }

  function handleRouting() {
    const hash = location.hash.slice(1);
    const [pagePath] = hash.split("?");

    if (pagePath === "full-text-page.html") {
      fetchFullTextPage();  // load content from Supabase
    }

  }

  // Load Home Content
  loadHomepageContent();


  // async function loadHomepageContent() {
  //   await loadFirstSectionSpecial();
  //   await loadNotesAndApplications();
  //   await loadTalks();
  //   await loadRecommendationHome();
  //   await loadSpecialAndPodcast();

  // }

  async function loadHomepageContent() {
    showSpinner(); // ✅ Show spinner before starting any fetches

    try {
      await loadFirstSectionSpecial();
      await loadNotesAndApplications();
      await loadTalks();
      await loadRecommendationHome();
      await loadSpecialAndPodcast();
    } catch (error) {
      console.error('Error loading homepage content:', error);
    } finally {
      hideSpinner(); // ✅ Hide spinner after all fetches complete
    }
  }


  function createArticleHTML(item, size = 'small', type) {
    const link = `full-text-page.html?id=${item.id}&type=${type}`;
    return `
    <div class="article ${size}">
        <a href="${link}" style="text-decoration: none; color: inherit;">
            <img src="${item.image}" alt="${item.title}">
        </a>
        <h3><a href="${link}" style="text-decoration: none; color: inherit;">${item.title}</a></h3>
        ${item.date ? `<p>${item.date}</p>` : ''}
    </div>
  `;
  }


  // ✅ Section 1: No title → special
  async function loadFirstSectionSpecial() {
    const { data, error } = await supabase
      .from('special')
      .select('*')
      .order('id', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error loading special section:', error);
      return;
    }

    const rightContainer = document.querySelector('.articles-wrapper .right-article');
    const leftContainer = document.querySelector('.articles-wrapper .left-articles');

    if (!data || data.length === 0) return;

    // First article → large → right column
    const first = data[0];
    const firstLink = `full-text-page.html?id=${first.id}&type=special`;
    rightContainer.innerHTML = `
    <div class="article large nav-links">
        <a href="${firstLink}" style="text-decoration: none; color: inherit;">
            <img src="${first.image}" alt="${first.title}">
        </a>
        <h3><a href="${firstLink}" style="text-decoration: none; color: inherit;">${first.title}</a></h3>
        <p>${first.date || ''}</p>
    </div>
`;

    // Remaining → small articles → left column
    const leftArticles = data.slice(1).map(item => {
      const link = `full-text-page.html?id=${item.id}&type=special`;
      return `
        <div class="article small nav-links">
            <a href="${link}" style="text-decoration: none; color: inherit;">
                <img src="${item.image}" alt="${item.title}">
            </a>
            <h3><a href="${link}" style="text-decoration: none; color: inherit;">${item.title}</a></h3>
            <p>${item.date || ''}</p>
        </div>
    `;
    }).join('');


    leftContainer.innerHTML = leftArticles;
  }


  // ✅ Section 2: Notes → no date
  async function loadNotesAndApplications() {
    try {
      const [{ data: notes, error: notesError }, { data: provinces, error: provincesError }] = await Promise.all([
        supabase.from('notes').select('*').order('id', { ascending: false }).limit(6),
        supabase.from('provinces').select('*').eq('open', true)
      ]);

      if (notesError || provincesError) {
        console.error('Error loading notes or applications:', notesError || provincesError);
        return;
      }

      // Fill first row with first 4 notes
      const firstRow = document.querySelector('.articles-row.first-row');
      firstRow.innerHTML = notes.slice(0, 4).map(item =>
        createArticleHTML({ ...item, date: null }, 'books', 'notes')
      ).join('');

      // Fill right column (last 2 notes)
      const rightColumn = document.querySelector('.second-row .right-column');
      rightColumn.innerHTML = notes.slice(4, 6).map(item =>
        createArticleHTML({ ...item, date: null }, 'books', 'notes')
      ).join('');

      // Fill left column with application cards
      const leftColumn = document.querySelector('.second-row .left-column');
      leftColumn.innerHTML = ''; // Clear existing content

      provinces.forEach(province => {
        const card = document.createElement('div');
        card.classList.add('application-card');
        card.innerHTML = `
        <a href="request.html?province=${province.provinces}" style="text-decoration: none; color: inherit;">
          <div class="application-text">
            <div class="application-detail">
              <span class="icon-circle"><i class="fas fa-file-alt"></i></span>
              <div class="application-titles">
                <h3>فرم درخواست ولایت ${province.provinces}</h3>
                <h4>${province.date}</h4>
              </div>
            </div>
            <p>${province.description}</p>
          </div>
        </a>
      `;
        leftColumn.appendChild(card);
      });

    } catch (err) {
      console.error('Unexpected error loading notes/applications:', err);
    }
  }

  // ✅ Section 3: Talks
  async function loadTalks() {
    const { data, error } = await supabase.from('talks').select('*').order('id', { ascending: false }).limit(4);
    if (error) return console.error('Error loading talks:', error);

    const container = document.querySelectorAll('.articles-section')[1].querySelector('.articles-row');
    container.innerHTML = data.map(item => createArticleHTML({ ...item, date: null }, 'books', 'talks')).join('');
  }

  // ✅ Section 4: Recommendations
  async function loadRecommendationHome() {
    const { data, error } = await supabase
      .from('recommendations')
      .select('*')
      .order('id', { ascending: false })
      .limit(4);

    if (error) {
      console.error('Error loading recommendations:', error);
      return;
    }

    const container = document.querySelectorAll('.articles-section')[2]?.querySelector('.articles-row');
    if (!container) return;

    container.innerHTML = ''; // Clear existing

    data.forEach(item => {
      const card = document.createElement('a');
      card.href = `recommendations.html?category=${encodeURIComponent(item.category)}`;
      card.style.textDecoration = 'none';
      card.style.color = 'inherit';
      card.classList.add('books'); // so it matches existing styles

      card.innerHTML = `
      <img src="${item.bookImage}" alt="${item.bookName}" />
      <div class="text">
        <h3>${item.bookName}</h3>
      </div>
    `;

      container.appendChild(card);
    });
  }

  // ✅ Review Section: right → special[0], left → podcast
  async function loadSpecialAndPodcast() {
    try {
      // Fetch special (limit 2)
      const { data: specialData, error: specialError } = await supabase
        .from('special')
        .select('*')
        .order('id', { ascending: false })
        .limit(2);

      // Fetch podcast (limit 3)
      const { data: podcastData, error: podcastError } = await supabase
        .from('podcast')
        .select('*')
        .order('id', { ascending: false })
        .limit(3);

      if (specialError || podcastError) {
        console.error('Fetch error:', specialError || podcastError);
        return;
      }

      // Fill the two right columns with special data
      const rightColumns = document.querySelectorAll('.review-section .right-column');
      specialData.forEach((item, index) => {
        if (rightColumns[index]) {
          const wrapper = document.createElement('a');
          wrapper.href = `full-text-page.html?id=${item.id}&type=special`;
          wrapper.style.textDecoration = 'none';
          wrapper.style.color = 'inherit';
          wrapper.innerHTML = `
              <img src="${item.image}" alt="${item.title}">
              <h3 style="margin: 0;">${item.title}</h3>
          `;
          rightColumns[index].innerHTML = '';
          rightColumns[index].appendChild(wrapper);
        }
      });

      // Fill left column with podcast data
      const leftColumn = document.querySelector('.review-section .left-column');
      leftColumn.innerHTML = ''; // Clear existing

      podcastData.forEach(item => {
        const article = document.createElement('div');
        article.classList.add('small-article');

        article.innerHTML = `
    <a href="full-text-page.html?id=${item.id}&type=podcast" style="text-decoration: none; color: inherit; display: flex; align-items: center; gap: 10px;">
      <div style="position: relative; width: 110px;">
        <img src="${item.image}" alt="${item.title}" style="width: 110px; height: auto; display: block;">
        <span class="audio-icon-home">
          <i class="fas fa-volume-up"></i>
        </span>
      </div>
      <div class="text">
        <h3 style="margin: 0;">${item.title}</h3>
      </div>
    </a>
  `;

        leftColumn.appendChild(article);
      });



    } catch (err) {
      console.error('Unexpected error loading review section:', err);
    }
  }







  // --- Recommendations ---

  document.querySelectorAll('.dropdown-content a').forEach(link => {
    link.addEventListener('click', async event => {
      event.preventDefault();
      const categoryName = link.textContent.trim();
      try {
        const { data, error } = await supabase
          .from('recommendations')
          .select('*');

        if (error) throw error;

        updateTable(data, categoryName);
      } catch (error) {
        console.error('Error loading data from Supabase:', error.message);
      }
    });
  });

  async function loadRecommendations(selectedCategory) {
    try {
      const { data, error } = await supabase
        .from('recommendations')
        .select('*');

      if (error) throw error;

      updateTable(data, selectedCategory);
    } catch (error) {
      console.error('Error loading data from Supabase:', error.message);
    }
  }

  function updateTable(data, categoryName) {
    const section = document.getElementById("author-section");
    const categoryData = data.find(item => item.category === categoryName);
    const description = categoryData ? categoryData.description : "توضیحی برای این دسته موجود نیست.";

    section.querySelector(".section-header h2").textContent = categoryName;
    section.querySelector("#category-description").textContent = description;

    const tableBody = section.querySelector("tbody");
    tableBody.innerHTML = "";

    const filteredData = data.filter(item => item.category === categoryName);
    if (filteredData.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8">داده‌ای برای این دسته موجود نیست.</td></tr>`;
      return;
    }

    filteredData.forEach((item, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
      <td>${index + 1}</td>
      <td><img src="${item.authorImage}" alt="عکس نویسنده" class="author-photo"></td>
      <td>${item.authorName}</td>
      <td><img src="${item.bookImage}" alt="عکس کتاب" class="book-photo"></td>
      <td>${item.bookName}</td>
      <td>${item.genre}</td>
      <td>${item.translator}</td>
      <td>${item.publisher}</td>
    `;
      tableBody.appendChild(row);
    });
  }


  function handleProvinceInfo(selectedProvince) {
    const requestsContainer = document.querySelector('.requests-container');
    const formSection = document.querySelector('.request-form-section');

    if (!requestsContainer || !formSection) return;

    let infoDiv = document.getElementById('province-info');
    if (!infoDiv) {
      infoDiv = document.createElement('div');
      infoDiv.id = 'province-info';
      requestsContainer.prepend(infoDiv);
    }

    if (!selectedProvince) {
      infoDiv.innerHTML = `<h2>لطفاً یک ولایت را از منو انتخاب کنید.</h2>`;
      formSection.style.display = 'none';
      return;
    }

    supabase
      .from('provinces')
      .select('*')
      .eq('provinces', selectedProvince)
      .single()
      .then(({ data: province, error }) => {
        if (province && province.open) {
          infoDiv.innerHTML = `<h2>ثبت نام باز است برای ${selectedProvince}</h2><p>تاریخ: ${province.date}</p>`;
          formSection.style.display = 'block';
        } else if (province && !province.open) {
          infoDiv.innerHTML = `<h2>متاسفانه ثبت نام برای ${selectedProvince} بسته است.</h2>`;
          formSection.style.display = 'none';
        } else {
          infoDiv.innerHTML = `<h2>اطلاعاتی برای ${selectedProvince} یافت نشد.</h2>`;
          formSection.style.display = 'none';
        }
      })
      .catch(error => {
        console.error('Error loading province data from Supabase:', error.message);
      });
  }

  function setupPaginatedSection(tableName, sectionClass, itemsPerPage = 8) {
    let currentPage = parseInt(localStorage.getItem('currentPage')) || 1;
    let dataItems = [];

    const fetchData = async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.error('Error fetching data:', error);
        return;
      }

      dataItems = data;
      renderPage(currentPage);
      setupPagination();
    };

    const renderPage = (page) => {
      const section = document.querySelector(sectionClass);
      if (!section) return;

      section.innerHTML = "";

      const start = (page - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      const pageItems = dataItems.slice(start, end);

      for (let i = 0; i < pageItems.length; i += 4) {
        const row = document.createElement("div");
        row.className = "articles-row";

        const rowItems = pageItems.slice(i, i + 4);
        rowItems.forEach(item => {
          const itemDiv = document.createElement("div");
          itemDiv.className = "books";


          if (tableName === "podcast") {
            itemDiv.innerHTML = `
              <a href="#full-text-page.html?id=${item.id}" class="nav-links">
            <div class="image-wrapper">
            <img src="${item.image}" alt="item">
            <span class="audio-icon"><i class="fas fa-volume-up"></i>
            </span>
            </div>
            <h3>${item.title}</h3>
            </a>
             `;
          } else {
            itemDiv.innerHTML = `
             <a href="#full-text-page.html?id=${item.id}" class="nav-links">
            <img src="${item.image}" alt="item">
            <h3>${item.title}</h3>
           </a>
            `;
          }


          const link = itemDiv.querySelector("a");
          link.addEventListener("click", function (e) {
            e.preventDefault();
            const pageUrl = this.getAttribute("href");

            history.pushState(null, "", pageUrl);
            fetch("#full-text-page.html")
              .then(res => res.text())
              .then(data => {
                const content = document.getElementById("main-content");
                content.innerHTML = "";
                window.scrollTo(0, 0);
                content.innerHTML = data;
                fetchFullTextPage(pageUrl);
              })
              .catch(() => {
                console.error("❌ Error loading page:", err);
                document.getElementById("main-content").innerHTML = "<h2>خطا در بارگیری صفحه</h2>";
              });
          });

          row.appendChild(itemDiv);
        });

        section.appendChild(row);
        if (i + 4 < pageItems.length) {
          const divider = document.createElement("hr");
          divider.className = "divider";
          section.appendChild(divider);
        }
      }
    };

    const setupPagination = () => {
      const pagination = document.querySelector(".pagination");
      if (!pagination) return;

      const totalPages = Math.ceil(dataItems.length / itemsPerPage);
      pagination.innerHTML = "";

      const createLink = (label, targetPage, isActive = false) => {
        const a = document.createElement("a");
        a.textContent = label;
        if (isActive) a.classList.add("active");
        // a.href = "#";
        a.onclick = (e) => {
          e.preventDefault();
          currentPage = targetPage;
          localStorage.setItem('currentPage', targetPage);
          renderPage(currentPage);
          setupPagination();
        };
        return a;
      };

      pagination.appendChild(createLink("« قبلی ", Math.max(currentPage - 1, 1)));

      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || Math.abs(currentPage - i) <= 1) {
          pagination.appendChild(createLink(i, i, currentPage === i));
        } else if (
          (i === currentPage - 2 || i === currentPage + 2) &&
          !pagination.innerHTML.includes("...")
        ) {
          const span = document.createElement("span");
          span.textContent = "...";
          pagination.appendChild(span);
        }
      }

      pagination.appendChild(createLink("بعدی »", Math.min(currentPage + 1, totalPages)));
    };

    fetchData();
  }

  // Update these to use table names
  function fetchNotes() {
    setupPaginatedSection("notes", ".articles-section");
    //bindNavLinkClicks();
  }

  function fetchTalks() {
    setupPaginatedSection("talks", ".talks-section");
    //bindNavLinkClicks();
  }

  function fetchSpecial() {
    setupPaginatedSection("special", ".articles-section");
  }

  function fetchPodcast() {
    setupPaginatedSection("podcast", ".articles-section");
  }


  // --- Sidebar Loader ---
  async function loadLatestContentSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    // Prevent multiple runs
    if (window.sidebarLoading) return;
    window.sidebarLoading = true;

    // Clear all previous items
    sidebar.innerHTML = '';

    const tables = ['special', 'notes', 'podcast', 'talks'];
    const latestItems = [];

    try {
      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .order('date', { ascending: false })
          .limit(1);

        if (error) {
          console.error(`❌ Error fetching from ${table}:`, error);
          continue;
        }

        if (data && data.length > 0) {
          latestItems.push({ ...data[0], table });
        }
      }

      latestItems.forEach(item => {
        const link = document.createElement('a');
        link.href = `#full-text-page.html?id=${item.id}`;
        link.className = 'news-item';

        link.addEventListener('click', function (e) {
          e.preventDefault();
          const newUrl = this.getAttribute("href");
          history.pushState(null, "", newUrl);
          fetchFullTextPage(); // Re-render full text
        });

        const img = document.createElement('img');
        img.src = item.image || "default.jpg";
        img.alt = "latest content image";

        const title = document.createElement('h3');
        title.textContent = item.title || "بدون عنوان";

        link.appendChild(img);
        link.appendChild(title);
        sidebar.appendChild(link);
      });

    } catch (error) {
      console.error("❌ Error loading latest content:", error);
    }

    window.sidebarLoading = false;
  }



  window.addEventListener("hashchange", handleRouting);
  window.addEventListener("load", handleRouting);


  document.querySelector('.fa-search').addEventListener('click', () => {
    const bar = document.getElementById('search-bar');
    bar.style.left = bar.style.left === '0px' ? '-100%' : '0px';
    document.body.style.overflow = 'hidden';
  });

  document.getElementById('search-input').addEventListener('input', async function () {
    const query = this.value.trim().toLowerCase();
    const resultsDiv = document.getElementById('search-results');
    resultsDiv.innerHTML = '';

    if (!query) return;

    const tables = ['notes', 'podcast', 'talks', 'special'];
    let allResults = [];

    for (let table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .ilike('title', `%${query}%`)
        .limit(3);

      if (data) {
        allResults.push(...data.map(item => ({
          ...item,
          table
        })));
      }
    }

    if (allResults.length === 0) {
      resultsDiv.innerHTML = "<p>نتیجه‌ای یافت نشد.</p>";
      return;
    }

    allResults.forEach(item => {
      const result = document.createElement('div');
      result.innerHTML = `
      <a href="#full-text-page.html?id=${item.id}&type=${item.table}" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
        <img src="${item.image}" alt="${item.title}" style="width: 60px; height: auto;">
        <div>
          <h4 style="margin: 0;">${item.title}</h4>
        </div>
      </a>
    `;

      result.querySelector("a").addEventListener("click", function (e) {
        e.preventDefault();
        const newUrl = this.getAttribute("href");
        history.pushState({ href: newUrl }, "", `#${newUrl}`);
        document.getElementById('search-bar').style.left = "-100%"; // hide bar
        fetchFullTextPage();
        document.body.style.overflow = '';
      });

      resultsDiv.appendChild(result);
    });
  });

  const searchBar = document.getElementById('search-bar');
  const searchInput = document.getElementById('search-input');
  const searchClose = document.getElementById('search-close');

  // Toggle open on search icon click
  // document.querySelector('.fa-search').addEventListener('click', (e) => {
  //   e.stopPropagation(); // prevent triggering body click
  //   searchBar.style.left = '0px';
  //   searchInput.focus();
  // });

  // Close on "×" click
  searchClose.addEventListener('click', () => {
    searchBar.style.left = '-100%';

    setTimeout(() => {
      searchInput.value = '';
      document.getElementById('search-results').innerHTML = '';
      document.body.style.overflow = '';
    }, 300);
  });

  // Close if clicking outside the sidebar
  document.body.addEventListener('click', (e) => {
    if (!searchBar.contains(e.target) && !e.target.classList.contains('fa-search')) {
      searchBar.style.left = '-100%';
      searchInput.value = '';
      document.getElementById('search-results').innerHTML = '';
      document.body.style.overflow = '';
    }
  });

  // Prevent closing when clicking inside
  // searchBar.addEventListener('click', e => {
  //   e.stopPropagation();
  // });

  function showSpinner() {
    document.getElementById('loading-spinner').style.display = 'flex';
  }

  function hideSpinner() {
    document.getElementById('loading-spinner').style.display = 'none';
  }


});



