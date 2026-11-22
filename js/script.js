(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const exists = (...ids) => ids.every((id) => $(id));
  const readNumber = (id) => {
    const el = $(id);
    return el ? Number(el.value) : NaN;
  };
  const isFiniteValues = (...values) => values.every(Number.isFinite);
  const showError = (message) => window.alert(message);
  const money = (value, digits = 2) => {
    if (!Number.isFinite(value)) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value);
  };

  // Shared site features. These elements also exist on the supporting pages.
  if ($("year")) $("year").textContent = new Date().getFullYear();

  if ($("menuToggle") && $("mainNav")) {
    $("menuToggle").addEventListener("click", () => {
      const isOpen = $("mainNav").classList.toggle("open");
      $("menuToggle").setAttribute("aria-expanded", String(isOpen));
    });
  }

  // Dark mode is available across the entire site and persists on this device.
  const mainNav = $("mainNav");
  if (mainNav && !$("themeToggle")) {
    const themeToggle = document.createElement("button");
    themeToggle.id = "themeToggle";
    themeToggle.className = "theme-toggle";
    themeToggle.type = "button";
    themeToggle.setAttribute("aria-pressed", "false");
    const applyTheme = (dark) => {
      document.body.classList.toggle("dark-mode", dark);
      themeToggle.textContent = dark ? "☀ Light mode" : "☾ Dark mode";
      themeToggle.setAttribute("aria-pressed", String(dark));
    };
    applyTheme(localStorage.getItem("calcpro-theme") === "dark");
    themeToggle.addEventListener("click", () => {
      const dark = !document.body.classList.contains("dark-mode");
      localStorage.setItem("calcpro-theme", dark ? "dark" : "light");
      applyTheme(dark);
    });
    mainNav.appendChild(themeToggle);
  }

  // Everything below this point belongs to the calculator home page only.
  // This guard prevents calculator code from running on About, Privacy Policy and Terms pages that share this JavaScript file.
  const isCalculatorPage = Boolean($("emiCalculate") && $("emiPrincipal") && $("calc-emi"));
  if (!isCalculatorPage) return;

  // GA4 interaction tracking: record calculator names and actions only.
  // Do not send calculator input values, dates, or financial amounts to Analytics.
  function trackPrimeCalProEvent(eventName, calculatorName) {
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, { calculator_name: calculatorName });
    }
  }

  document.querySelectorAll(".tool-link[data-tool]").forEach((button) => {
    button.addEventListener("click", () => {
      trackPrimeCalProEvent("calculator_selected", button.dataset.tool);
    });
  });

  const calculateButtons = {
    emiCalculate: "emi",
    gstCalculate: "gst",
    sipCalculate: "sip",
    ageCalculate: "age",
    pctCalculate: "percentage",
    discountCalculate: "discount"
  };
  Object.entries(calculateButtons).forEach(([buttonId, calculatorName]) => {
    const button = $(buttonId);
    if (button) {
      button.addEventListener("click", () => {
        trackPrimeCalProEvent("calculator_calculate_clicked", calculatorName);
      });
    }
  });

  // Calculator navigation and search.
  const descriptions = {
    emi: ["LOAN PLANNING", "EMI Calculator", "Estimate your monthly loan repayment and total interest.", "₹"],
    gst: ["TAX ESTIMATION", "GST Calculator", "Add GST to a price or calculate the tax included in a total.", "%"],
    sip: ["INVESTMENT PLANNING", "SIP Calculator", "Estimate the potential future value of regular monthly investments.", "↗"],
    age: ["DATE & TIME", "Age Calculator", "Calculate an age in years, months and days.", "◷"],
    percentage: ["QUICK MATH", "Percentage Calculator", "Calculate a percentage of a number or a part of a total.", "％"],
    discount: ["SMART SHOPPING", "Discount Calculator", "Find the sale price and how much you save.", "%"]
  };

  function selectTool(tool) {
    const description = descriptions[tool];
    if (!description) return;
    document.querySelectorAll(".tool-link").forEach((button) => {
      button.classList.toggle("active", button.dataset.tool === tool);
    });
    document.querySelectorAll(".calc-content").forEach((panel) => {
      panel.classList.toggle("hidden", panel.id !== `calc-${tool}`);
    });
    if ($("calcKicker")) $("calcKicker").textContent = description[0];
    if ($("calcTitle")) $("calcTitle").textContent = description[1];
    if ($("calcDescription")) $("calcDescription").textContent = description[2];
    if ($("panelSymbol")) $("panelSymbol").textContent = description[3];
  }

  document.querySelectorAll(".tool-link").forEach((button) => {
    button.addEventListener("click", () => selectTool(button.dataset.tool));
  });

  // Allow dedicated SEO pages to open the matching calculator on the home page.
  const requestedCalculator = new URLSearchParams(window.location.search).get("calculator");
  if (requestedCalculator && descriptions[requestedCalculator]) {
    selectTool(requestedCalculator);
    const target = $("calculators");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if ($("toolSearch")) {
    $("toolSearch").addEventListener("input", (event) => {
      const query = event.target.value.toLowerCase().trim();
      document.querySelectorAll(".tool-link").forEach((button) => {
        button.classList.toggle("hidden", !button.textContent.toLowerCase().includes(query));
      });
    });
  }

  // EMI calculator. Validation runs only after the Calculate EMI button is clicked.
  function calculateEMI() {
    if (!exists("emiPrincipal", "emiRate", "emiYears", "emiResult", "emiPrincipalOut", "emiInterest", "emiTotal")) return;
    const principal = readNumber("emiPrincipal");
    const annualRate = readNumber("emiRate");
    const years = readNumber("emiYears");
    if (!isFiniteValues(principal, annualRate, years) || principal <= 0 || annualRate < 0 || annualRate > 100 || years <= 0 || years > 50) {
      showError("Enter a positive loan amount and tenure, and a valid interest rate (0–100%).");
      return;
    }
    const months = Math.round(years * 12);
    const monthlyRate = annualRate / 1200;
    const emi = monthlyRate === 0
      ? principal / months
      : principal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
    const total = emi * months;
    $("emiResult").textContent = money(emi);
    $("emiPrincipalOut").textContent = money(principal, 0);
    $("emiInterest").textContent = money(total - principal, 0);
    $("emiTotal").textContent = money(total, 0);
  }
  $("emiCalculate").addEventListener("click", calculateEMI);

  // GST calculator.
  let gstMode = "exclusive";
  document.querySelectorAll("[data-gst-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      gstMode = button.dataset.gstMode;
      document.querySelectorAll("[data-gst-mode]").forEach((item) => item.classList.toggle("active", item === button));
      if ($("gstAmountLabel")) $("gstAmountLabel").textContent = gstMode === "exclusive" ? "Original amount (₹)" : "Amount including GST (₹)";
      if ($("gstMainLabel")) $("gstMainLabel").textContent = gstMode === "exclusive" ? "Total amount including GST" : "Original amount before GST";
    });
  });
  if ($("gstRate") && $("gstCustomWrap")) {
    $("gstRate").addEventListener("change", () => {
      $("gstCustomWrap").classList.toggle("hidden", $("gstRate").value !== "custom");
    });
  }
  function calculateGST() {
    if (!exists("gstAmount", "gstRate", "gstTotal", "gstBase", "gstTax", "gstRateOut")) return;
    const amount = readNumber("gstAmount");
    const rate = $("gstRate").value === "custom" ? readNumber("gstCustom") : Number($("gstRate").value);
    if (!isFiniteValues(amount, rate) || amount < 0 || rate < 0 || rate > 100) {
      showError("Enter a valid amount and GST rate (0–100%).");
      return;
    }
    const base = gstMode === "exclusive" ? amount : amount / (1 + rate / 100);
    const tax = gstMode === "exclusive" ? amount * rate / 100 : amount - base;
    const total = gstMode === "exclusive" ? amount + tax : amount;
    $("gstTotal").textContent = money(gstMode === "exclusive" ? total : base);
    $("gstBase").textContent = money(base);
    $("gstTax").textContent = money(tax);
    $("gstRateOut").textContent = `${rate}%`;
  }
  if ($("gstCalculate")) $("gstCalculate").addEventListener("click", calculateGST);

  // SIP calculator. Assumes contributions at month-end and monthly compounding.
  function calculateSIP() {
    if (!exists("sipMonthly", "sipRate", "sipYears", "sipFuture", "sipInvested", "sipReturns", "sipPeriod")) return;
    const monthlyInvestment = readNumber("sipMonthly");
    const annualReturn = readNumber("sipRate");
    const years = readNumber("sipYears");
    if (!isFiniteValues(monthlyInvestment, annualReturn, years) || monthlyInvestment <= 0 || annualReturn < 0 || annualReturn > 100 || years <= 0 || years > 60) {
      showError("Enter a positive monthly investment and period, with an annual return rate between 0% and 100%.");
      return;
    }
    const months = Math.round(years * 12);
    const monthlyRate = annualReturn / 1200;
    const futureValue = monthlyRate === 0
      ? monthlyInvestment * months
      : monthlyInvestment * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    const invested = monthlyInvestment * months;
    $("sipFuture").textContent = money(futureValue, 0);
    $("sipInvested").textContent = money(invested, 0);
    $("sipReturns").textContent = money(futureValue - invested, 0);
    $("sipPeriod").textContent = `${years} years`;
  }
  if ($("sipCalculate")) $("sipCalculate").addEventListener("click", calculateSIP);

  // Age calculator.
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if ($("birthDate")) $("birthDate").max = today;
  if ($("ageAsOf")) $("ageAsOf").value = today;
  function calculateAge() {
    if (!exists("birthDate", "ageAsOf", "ageResult", "ageMonths", "ageWeeks", "ageDays")) return;
    const birthValue = $("birthDate").value;
    const asOfValue = $("ageAsOf").value;
    if (!birthValue || !asOfValue) {
      showError("Please select both dates.");
      return;
    }
    const [birthYear, birthMonth, birthDay] = birthValue.split("-").map(Number);
    const [asOfYear, asOfMonth, asOfDay] = asOfValue.split("-").map(Number);
    const birth = new Date(Date.UTC(birthYear, birthMonth - 1, birthDay));
    const asOf = new Date(Date.UTC(asOfYear, asOfMonth - 1, asOfDay));
    if (asOf < birth) {
      showError("The calculation date cannot be before the date of birth.");
      return;
    }
    let years = asOfYear - birthYear;
    let months = asOfMonth - birthMonth;
    let days = asOfDay - birthDay;
    if (days < 0) {
      months -= 1;
      days += new Date(Date.UTC(asOfYear, asOfMonth - 1, 0)).getUTCDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    const totalDays = Math.floor((asOf - birth) / 86400000);
    $("ageResult").textContent = `${years} years, ${months} months, ${days} days`;
    $("ageMonths").textContent = (years * 12 + months).toLocaleString("en-IN");
    $("ageWeeks").textContent = Math.floor(totalDays / 7).toLocaleString("en-IN");
    $("ageDays").textContent = totalDays.toLocaleString("en-IN");
  }
  if ($("ageCalculate")) $("ageCalculate").addEventListener("click", calculateAge);

  // Percentage calculator.
  function calculatePercentage() {
    if (!exists("pctX", "pctY", "pctPart", "pctWhole", "pctMainLabel", "pctResult", "pctOfTotal", "pctFormula")) return;
    const x = readNumber("pctX");
    const y = readNumber("pctY");
    const part = readNumber("pctPart");
    const whole = readNumber("pctWhole");
    if (!isFiniteValues(x, y, part, whole) || whole === 0) {
      showError("Enter valid numbers. The total value must not be zero.");
      return;
    }
    const result = x / 100 * y;
    const ratio = part / whole * 100;
    $("pctMainLabel").textContent = `${x}% of ${y}`;
    $("pctResult").textContent = Number(result.toFixed(6)).toLocaleString("en-IN");
    $("pctOfTotal").textContent = `${Number(ratio.toFixed(4)).toLocaleString("en-IN")}%`;
    $("pctFormula").textContent = `${x} ÷ 100 × ${y}`;
  }
  if ($("pctCalculate")) $("pctCalculate").addEventListener("click", calculatePercentage);

  // Discount calculator.
  function calculateDiscount() {
    if (!exists("discountPrice", "discountRate", "discountFinal", "discountSaving", "discountOriginal", "discountRateOut")) return;
    const price = readNumber("discountPrice");
    const rate = readNumber("discountRate");
    if (!isFiniteValues(price, rate) || price < 0 || rate < 0 || rate > 100) {
      showError("Enter a valid price and discount between 0% and 100%.");
      return;
    }
    const saving = price * rate / 100;
    $("discountFinal").textContent = money(price - saving);
    $("discountSaving").textContent = money(saving);
    $("discountOriginal").textContent = money(price);
    $("discountRateOut").textContent = `${rate}%`;
  }
  if ($("discountCalculate")) $("discountCalculate").addEventListener("click", calculateDiscount);

  // Share or download the currently visible calculator result.
  function activeToolName() {
    const active = document.querySelector(".tool-link.active");
    return active ? active.querySelector("b").textContent : "Prime CalPro result";
  }
  function resultText() {
    const panel = document.querySelector(".calc-content:not(.hidden) .result-box");
    return panel ? `${activeToolName()}\n\n${panel.innerText.trim()}\n\nCalculated with Prime CalPro.` : "Prime CalPro result";
  }
  if ($("shareResult")) {
    $("shareResult").addEventListener("click", async () => {
      const text = resultText();
      try {
        if (navigator.share) {
          await navigator.share({ title: activeToolName(), text });
        } else {
          await navigator.clipboard.writeText(text);
          showError("Result copied to clipboard.");
        }
      } catch (error) {
        if (error && error.name !== "AbortError") showError("Unable to share the result on this browser.");
      }
    });
  }
  if ($("downloadResult")) {
    $("downloadResult").addEventListener("click", () => {
      const blob = new Blob([resultText()], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const slug = activeToolName().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      link.href = url;
      link.download = `calcpro-${slug || "result"}.txt`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });
  }

  // No calculator is automatically executed on page load. This is intentional:
  // it prevents validation alerts when navigating to pages that share this script.
})();
