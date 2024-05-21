import { DOMParser, Element, Node } from "deno_dom";

const htmlResponse = await fetch("https://fishingonorfu.hu/fellepok");
const html = await htmlResponse.text();

const document = new DOMParser().parseFromString(html, "text/html")!;

const table = document.querySelector("#performers table")!;

const dateNodes = Array.from(table.querySelectorAll(".header"));
const dates = dateNodes.map((node) => ({
  date: new Date(`2024.${node.lastChild.textContent} 12:00`),
  title: node.firstChild.textContent,
  id: node.lastChild.textContent,
}));

const stageNodes = Array.from(table.querySelectorAll(".column-header"));
const stages = stageNodes.map((node) => ({
  name: node.firstChild.textContent,
  node,
}));

const performerNodes = Array.from(table.querySelectorAll(".column"));

const performers = performerNodes
  .map((node) => {
    const youtubeLink = (node.lastChild as Element).dataset?.youtubeLink;
    return ({
      times: node.firstChild.textContent,
      name: node.lastChild.textContent,
      node,
      ...(youtubeLink ? { youtubeLink } : {}),
    });
  })
  .filter(({ name }) => name !== " ")
  .filter(({ name }) => name !== "-");

const dataPoints = performers.map((performer) => {
  const stage = stages.findLast((stage) => {
    const position = stage.node.compareDocumentPosition(performer.node);
    const isFollowingFlag = position & Node.DOCUMENT_POSITION_FOLLOWING;
    return Boolean(isFollowingFlag);
  })!;

  const date = (() => {
    const columnIndex = Array.from(performer.node.parentElement?.childNodes!)
      .indexOf(performer.node);
    return dates[columnIndex];
  })();

  const nextDate = new Date(date.date);
  nextDate.setDate(nextDate.getDate() + 1);

  const [startTime, endTime] = performer.times.split(" - ");
  const start = startTime.startsWith("0")
    ? `${nextDate.toISOString().slice(0, 10)} ${startTime}`
    : `${date.date.toISOString().slice(0, 10)} ${startTime}`;
  const end = endTime.startsWith("0")
    ? `${nextDate.toISOString().slice(0, 10)} ${endTime}`
    : `${date.date.toISOString().slice(0, 10)} ${endTime}`;

  return {
    stage: stage.name,
    act: performer.name,
    start,
    end,
    ...(performer.youtubeLink ? { url: performer.youtubeLink } : {}),
  };
});

for (const { start, end, stage, act, url } of dataPoints) {
  const optionalUrl = url ? `,"url":"${url}"` : "";
  console.log(
    `act = {"start":"${start}","end":"${end}","stage":"${stage}","act":"${act}"${optionalUrl}}`,
  );
}
