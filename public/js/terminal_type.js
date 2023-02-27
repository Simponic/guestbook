const TYPE_PERIOD_MS = 20;

const need_typing = Array.from(document.getElementsByClassName("type"));

let elements_done_typing = 0;

const type_element = (elem) =>
  new Promise((res) => {
    const split_text = elem.innerHTML.split(/(<.*>|)/g);

    elem.style.display = "block";
    elem.innerHTML = "";

    split_text.forEach((t, i) =>
      setTimeout(() => {
        elem.innerHTML = elem.innerHTML.slice(0, -1) + t + "_";
        if (i == split_text.length - 1) {
          elem.innerHTML = elem.innerHTML.slice(0, -1);
          res();
        }
      }, i * TYPE_PERIOD_MS)
    );
  });

const typing_promise = new Promise((res) => {
  need_typing.map((elem, i) => {
    type_element(elem).then(() => {
      elements_done_typing += 1;
      if (elements_done_typing == need_typing.length) res();
    });
  });
});
