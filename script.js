
(function () {
    'use strict';
  
    const allowedList = [];
    const staticBlockedList = ["._m8c", ".uiStreamSponsoredLink", 'a[data-hovercard][href*="hc_ref=ADS"]', 'a[role="button"][rel~="noopener"][data-lynx-mode="async"]'];
    const sponsoredTexts = ["Sponsored", "مُموَّل",
    "赞助内容",
    "贊助",
    "Sponzorováno",
    "Gesponsord",
    "May Sponsor",
    "Commandité",
    "Sponsorisé",
    "Gesponsert",
    "Χορηγούμενη",
    "ממומן",
    "प्रायोजित",
    "Hirdetés",
    "Bersponsor",
    "Sponsorizzato",
    "Sponsorowane",
    "Patrocinado",
    "Sponsorizat",
    "Реклама",
    "Sponzorované",
    "Publicidad",
    "ได้รับการสนับสนุน",
    "Sponsorlu",
    "Được tài trợ"
    ];
    const suggestedTexts = [
      "suggested for you", "gợi ý cho bạn"
    ];

    function getBlockedList() {
      const ariaLabels = sponsoredTexts.map(t => `a[aria-label="${t}"]`);
      return [...staticBlockedList, ...ariaLabels];
    }
    const blockedList = getBlockedList();
  
    function isHidden(e) {
      const style = window.getComputedStyle(e);
      if (style.display === "none" || style.opacity === "0" || style.fontSize === "0px" || style.visibility === "hidden" || style.position === "absolute") {
        return true;
      }
      return false;
    }
    function getTextFromElement(e) {
      return (e.innerText === "" ? e.dataset.content : e.innerText) || "";
    }
    function getTextFromContainerElement(e) {
      return e.dataset.content || Array.prototype.filter.call(e.childNodes, element => {
        return element.nodeType === Node.TEXT_NODE;
      }).map(element => {
        return element.textContent;
      }).join("");
    }
    function getVisibleText(e) {
      if (isHidden(e)) {
        return "";
      }
      const children = e.querySelectorAll(":scope > *");
      if (children.length !== 0) {
        return getTextFromContainerElement(e) + Array.prototype.slice.call(children).map(getVisibleText).flat().join("");
      }
      return getTextFromElement(e);
    }
    function hideIfSponsored(possibleSponsoredTextQueries, e) {
      if (allowedList.some(query => {
        if (e.querySelector(query) !== null) {
          e.dataset.blocked = "allowedList";
          // console.info(`Ignored (${query})`, [e]);
          return true;
        }
        return false;
      })) {
        return false;
      }
      if (blockedList.some(query => {
        if (e.querySelector(query) !== null) {
          e.style.display = "none";
          e.dataset.blocked = "blockedList";
          // console.info(`AD Blocked (${query})`, [e]);
          return true;
        }
        return false;
      })) {
        return true;
      }
      return possibleSponsoredTextQueries.some(query => {
        const result = e.querySelectorAll(query);
        return [...result].some(t => {
          const visibleText = getVisibleText(t);
          if (sponsoredTexts.some(sponsoredText => visibleText.indexOf(sponsoredText) !== -1)) {
            e.style.display = "none";
            e.dataset.blocked = "sponsored";
            // console.info(`AD Blocked (query='${query}', visibleText='${visibleText}')`, [e]);
            return true;
          }
          return false;
        });
      });
    }
  
    const possibleSponsoredTextQueries$1 = ['a[role="link"] > span[aria-labelledby]', 'div[role="button"] > span[aria-labelledby]'];
    function hideIfSponsored$2(e) {
      return hideIfSponsored(possibleSponsoredTextQueries$1, e);
    }
    function hideVideoIfSponsored(e) {
      const childNode = e.querySelector('div[aria-haspopup="menu"]:not([data-adblocked])');
      if (childNode !== null) {
        childNode.dataset.adblocked = true;
        e.style.display = "none";
        e.dataset.blocked = "sponsored";
        // console.info(`AD Blocked (div[aria-haspopup="menu"])`, [childNode, e]);
      }
    }
    let feedObserver$1 = null;
    let watchObserver = null;
    function setFeedObserver() {
      const feed = document.querySelector("div[role=feed]:not([data-adblock-monitored])");
      if (feed !== null) {
        feed.querySelectorAll('div[data-pagelet^="FeedUnit_"]').forEach(hideIfSponsored$2);
        const feedContainer = feed.parentNode;
        feed.dataset.adblockMonitored = true;
        feedObserver$1 = new MutationObserver(mutations => {
          mutations.forEach(mutation => {
            if (mutation.target === feedContainer && mutation.addedNodes.length > 0) {
              feedObserver$1.disconnect();
              setTimeout(setFeedObserver, 0);
            }
            if (mutation.target === feed && mutation.addedNodes.length > 0) {
              mutation.addedNodes.forEach(node => {
                if (node.dataset.pagelet && node.dataset.pagelet.startsWith("FeedUnit_")) {
                  hideIfSponsored$2(node);
                }
              });
            }
          });
        });
        feedObserver$1.observe(feed, {
          childList: true
        });
        feedObserver$1.observe(feedContainer, {
          childList: true
        });
        // console.info("Monitoring feed updates", [feed]);
      } else {
        setTimeout(setFeedObserver, 1000);
      }
    }
    function setWatchObserver() {
      const feed = document.querySelector('div[data-pagelet="MainFeed"]>div>div>div:not([data-adblock-monitored]):first-child');
      if (feed !== null) {
        feed.dataset.adblockMonitored = true;
        const feedContainer = feed.parentNode;
        watchObserver = new MutationObserver(mutations => {
          mutations.forEach(mutation => {
            if (mutation.target === feedContainer && mutation.addedNodes.length > 0) {
              watchObserver.disconnect();
              setTimeout(setWatchObserver, 0);
            }
            if (mutation.target === feed && mutation.addedNodes.length > 0) {
              mutation.addedNodes.forEach(node => {
                hideVideoIfSponsored(node);
              });
            }
          });
        });
        watchObserver.observe(feed, {
          childList: true
        });
        watchObserver.observe(feedContainer, {
          childList: true
        });
        // console.info("Monitoring watch updates", [feed]);
      } else {
        setTimeout(setWatchObserver, 1000);
      }
    }
    function onPageChange$1() {
      if (isFBWatch()) {
        if (feedObserver$1 !== null) {
          feedObserver$1.disconnect();
          feedObserver$1 = null;
        }
        onPageChangeInWatch();
      } else {
        if (watchObserver !== null) {
          watchObserver.disconnect();
          watchObserver = null;
        }
        onPageChangeInNewFeed();
      }
    }
    function onPageChangeInNewFeed() {
      if (document.querySelector("div[role=feed]:not([data-adblock-monitored])") !== null) {
        setFeedObserver();
        return;
      }
      if (document.getElementById("suspended-feed") !== null) {
        setFeedObserver();
        return;
      }
      if (feedObserver$1 !== null && document.querySelector("div[role=feed][data-adblock-monitored]") === null) {
        feedObserver$1.disconnect();
        feedObserver$1 = null;
      }
    }
    function onPageChangeInWatch() {
      if (document.querySelector('div[data-pagelet="MainFeed"]>div>div>div:not([data-adblock-monitored]):first-child') !== null) {
        setWatchObserver();
        return;
      }
      if (document.querySelector('div[role="progressbar"]') !== null) {
        setWatchObserver();
        return;
      }
      if (watchObserver !== null && document.querySelector('div[data-pagelet="MainFeed"]>div>div>div:first-child[data-adblock-monitored]') === null) {
        watchObserver.disconnect();
        watchObserver = null;
      }
    }
    const pageObserver$1 = new MutationObserver(onPageChange$1);
    function setupPageObserver$1() {
      const rootDiv = document.querySelector("div[data-pagelet=root]");
      if (rootDiv !== null) {
        onPageChange$1();
        pageObserver$1.observe(rootDiv, {
          childList: true,
          subtree: true
        });
        // console.info("Monitoring page changes", [rootDiv]);
      } else {
        setTimeout(setupPageObserver$1, 1000);
      }
    }
    window.addEventListener("beforeunload", () => {
      pageObserver$1.disconnect();
      if (feedObserver$1 !== null) {
        feedObserver$1.disconnect();
        feedObserver$1 = null;
      }
      if (watchObserver !== null) {
        watchObserver.disconnect();
        watchObserver = null;
      }
    });
    function isFB5() {
      return document.querySelectorAll("[id^=mount_0_0]").length > 0;
    }
    function isFBWatch() {
      return document.location.pathname === "/watch";
    }
    setupPageObserver$1();
    // getSuggestedList();
  
  }());
  