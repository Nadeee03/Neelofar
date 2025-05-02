document.addEventListener("DOMContentLoaded", function () {
  const content = document.getElementById("main-content");

  // --- Navigation Handling ---

  // Attach a single event listener to the document
  document.addEventListener("click", function (e) {
    // Check if the clicked element is a navigation link
    const link = e.target.closest(".nav-links a, .dropdown-content a");
    if (!link) return;

    e.preventDefault();
    const pageUrl = link.getAttribute("href");

    if (pageUrl === "index.html" || pageUrl === "/" || pageUrl === "#") {
      window.location.href = "index.html";
    } else {
      history.pushState(null, "", pageUrl);

      fetch(pageUrl)
        .then(res => res.text())
        .then(data => {
          content.innerHTML = "";
          window.scrollTo(0, 0);
          content.innerHTML = data;

          // Page-specific logic
          if (pageUrl.includes("request.html")) {
            handleProvinceInfo();
          }

          if (pageUrl.includes("recommendations.html")) {
            const urlParams = new URLSearchParams(new URL(pageUrl, window.location.origin).search);
            const selectedCategory = urlParams.get("category");
            if (selectedCategory) {
              loadRecommendations(selectedCategory);
            }
          }

          if (pageUrl.includes("notes.html")) {
            fetchNotes();
          }

          if (pageUrl.includes("talks.html")) {
            fetchTalks();
          }

          if (pageUrl.includes("full-text-page.html")) {
            fetchFullTextPage(pageUrl);
          }
        })
        .catch(err => {
          content.innerHTML = "<h2>خطا در بارگیری صفحه</h2>";
        });
    }
  });



  // --- Recommendations ---
  document.querySelectorAll('.dropdown-content a').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const categoryName = link.textContent.trim();
      fetch('recommendations.json')
        .then(response => response.json())
        .then(data => {
          updateTable(data, categoryName);
        })
        .catch(error => console.error('Error loading JSON:', error));
    });
  });

  function loadRecommendations(selectedCategory) {
    fetch('recommendations.json')
      .then(response => response.json())
      .then(data => {
        updateTable(data, selectedCategory);
      })
      .catch(error => {
        console.error('Error loading JSON:', error);
      });
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

  // --- Request Page ---
  function handleProvinceInfo() {
    const urlParams = new URLSearchParams(window.location.search);
    const selectedProvince = urlParams.get('province');
    const requestsContainer = document.querySelector('.requests-container');
    if (!requestsContainer) return;

    const infoDiv = document.createElement('div');
    infoDiv.id = 'province-info';
    requestsContainer.prepend(infoDiv);

    const formSection = document.querySelector('.request-form-section');
    if (!formSection) return;

    fetch('provinces.json')
      .then(response => response.json())
      .then(data => {
        const provinces = data.provinces;
        const province = provinces[selectedProvince];

        if (!selectedProvince) {
          infoDiv.innerHTML = `<h2>لطفاً یک ولایت را از منو انتخاب کنید.</h2>`;
          formSection.style.visibility = 'hidden';
        } else if (province && province.open) {
          infoDiv.innerHTML = `<h2>ثبت نام باز است برای ${selectedProvince}</h2><p>تاریخ: ${province.date}</p>`;
          formSection.style.display = 'block';
        } else if (province && !province.open) {
          infoDiv.innerHTML = `<h2>متاسفانه ثبت نام برای ${selectedProvince} بسته است.</h2>`;
          formSection.style.visibility = 'hidden';
        } else {
          infoDiv.innerHTML = `<h2>اطلاعاتی برای ${selectedProvince} یافت نشد.</h2>`;
          formSection.style.display = 'none';
        }
      })
      .catch(error => {
        console.error('Error loading provinces:', error);
      });
  }

  // --- Notes & Talks Shared Logic ---
  function setupPaginatedSection(jsonFile, sectionClass, itemsPerPage = 8) {
    let currentPage = 1;
    let dataItems = [];

    const fetchData = () => {
      fetch(jsonFile)
        .then(res => res.json())
        .then(data => {
          dataItems = data;
          renderPage(currentPage);
          setupPagination();
        });
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
          itemDiv.innerHTML = `
            <a href="full-text-page.html?id=${item.id}" class="nav-links">
              <img src="${item.image}" alt="item">
              <h3>${item.title}</h3>
            </a>
          `;

          // Add nav-style routing behavior
          const link = itemDiv.querySelector("a");
          link.addEventListener("click", function (e) {
            e.preventDefault();
            const pageUrl = this.getAttribute("href");

            history.pushState(null, "", pageUrl);

            fetch("full-text-page.html")
              .then(res => res.text())
              .then(data => {
                const content = document.getElementById("main-content");
                content.innerHTML = "";
                window.scrollTo(0, 0);
                content.innerHTML = data;
                fetchFullTextPage(pageUrl); // Load dynamic content
              })
              .catch(err => {
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
        a.href = "#";
        a.onclick = (e) => {
          e.preventDefault();
          currentPage = targetPage;
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

  function bindNavLinkClicks() {
    document.querySelectorAll(".nav-links a").forEach(link => {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        const pageUrl = this.getAttribute("href");

        if (pageUrl === "index.html" || pageUrl === "/" || pageUrl === "#") {
          window.location.href = "index.html";
        } else {
          history.pushState(null, "", pageUrl);
          fetch(pageUrl)
            .then(res => res.text())
            .then(data => {
              const content = document.getElementById("main-content");
              content.innerHTML = "";
              window.scrollTo(0, 0);
              content.innerHTML = data;

              if (pageUrl.startsWith("notes.html")) fetchNotes();
              if (pageUrl.startsWith("talks.html")) fetchTalks();
              if (pageUrl.startsWith("full-text-page.html")) fetchFullTextPage(pageUrl);
            })
            .catch(err => {
              document.getElementById("main-content").innerHTML = "<h2>خطا در بارگیری صفحه</h2>";
            });
        }
      });
    });
  }


  // --- Reusable Page Loaders ---
  function fetchNotes() {
    setupPaginatedSection("notes.json", ".articles-section");
    bindNavLinkClicks();
  }

  function fetchTalks() {
    setupPaginatedSection("talks.json", ".talks-section");
    bindNavLinkClicks();
  }

  // --- Full Text Page Loader ---
  function fetchFullTextPage(pageUrl) {
    const urlParams = new URLSearchParams(pageUrl.split("?")[1]);
    const bookId = urlParams.get("id");

    const sourceFile = bookId.startsWith("talk-")
      ? "talks.json"
      : bookId.startsWith("book")
        ? "notes.json"
        : "latestContent.json";


    fetch(sourceFile)
      .then(res => res.json())
      .then(data => {
        const book = data.find(item => item.id === bookId);
        if (!book) {
          document.querySelector(".full-text-main-content").innerHTML = "<p>یافت نشد.</p>";
          return;
        }

        // Main content
        const titleElement = document.querySelector(".full-text-container h1");
        const imageElement = document.querySelector(".top-image");
        const detailsSection = document.querySelector(".book-details");
        const dateElement = document.querySelector(".date")

        if (titleElement) titleElement.textContent = book.title;
        if (imageElement) imageElement.src = book.image;
        if (dateElement) dateElement.textContent = book.date
        if (detailsSection) {
          detailsSection.innerHTML = `
            <h2>${book.writer}</h2>
            <p>${book.content}</p>
          `;
        }

        // Related content (filter out the current book)
        const relatedItems = data.filter(item => item.id !== bookId).slice(0, 4);
        const relatedContainer = document.querySelector(".related-content");
        relatedContainer.innerHTML = " "; // Clear old items but keep the heading
        window.scrollTo({ top: 0, behavior: 'smooth' });


        relatedItems.forEach(item => {
          const div = document.createElement("div");
          div.className = "related-item";
          div.innerHTML = `
            <a href="full-text-page.html?id=${item.id}">
              <img src="${item.image}" alt="${item.title}" />
              <p>${item.title}</p>
            </a>
          `;

          const link = div.querySelector("a");
          link.addEventListener("click", function (e) {
            e.preventDefault();
            const newUrl = this.getAttribute("href");

            history.pushState(null, "", newUrl);
            fetchFullTextPage(newUrl); // 🔁 re-run the function with new ID
          });

          relatedContainer.appendChild(div);
        });


        // Optionally load latest items in sidebar
        loadLatestContentSidebar();
      })
      .catch(err => {
        console.error("Error loading full text:", err);
      });
  }

  // Run on page load
  document.addEventListener("DOMContentLoaded", () => {
    fetchFullTextPage(window.location.href);
  });


  // --- Sidebar Loader ---
  function loadLatestContentSidebar() {
    fetch('latestContent.json')
      .then(response => {
        if (!response.ok) throw new Error("Network response was not ok");
        return response.json();
      })
      .then(data => {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        sidebar.querySelectorAll('.news-item').forEach(item => item.remove());

        data.forEach(item => {
          const link = document.createElement('a');
          link.href = `full-text-page.html?id=${item.id}`;
          link.className = 'news-item';

          link.addEventListener('click', function (e) {
            e.preventDefault();
            const pageUrl = this.getAttribute("href");

            history.pushState(null, "", pageUrl);
            fetch("full-text-page.html")
              .then(res => res.text())
              .then(html => {
                const content = document.getElementById("main-content");
                content.innerHTML = html;
                window.scrollTo(0, 0);
                fetchFullTextPage(pageUrl); // load specific content
              })
              .catch(() => {
                document.getElementById("main-content").innerHTML = "<h2>خطا در بارگیری صفحه</h2>";
              });
          });

          const img = document.createElement('img');
          img.src = item.image;
          img.alt = "latest content image";

          const title = document.createElement('h3');
          title.textContent = item.title;

          link.appendChild(img);
          link.appendChild(title);
          sidebar.appendChild(link);
        });
      })
      .catch(error => {
        console.error("Error loading latest content:", error);
      });
  }


  if (window.location.pathname.endsWith("full-text-page.html")) {
    fetchFullTextPage(window.location.href);
  }
});
