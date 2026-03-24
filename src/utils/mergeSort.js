export function* mergeSortGenerator(arr) {
  if (arr.length <= 1) return arr;

  const mid = Math.floor(arr.length / 2);
  const left = yield* mergeSortGenerator(arr.slice(0, mid));
  const right = yield* mergeSortGenerator(arr.slice(mid));

  return yield* merge(left, right);
}

function* merge(left, right) {
  const result = [];
  let i = 0;
  let j = 0;

  while (i < left.length && j < right.length) {
    const choice = yield { left: left[i], right: right[j] };

    if (choice === "left") {
      result.push(left[i]);
      i++;
    } else {
      result.push(right[j]);
      j++;
    }
  }

  while (i < left.length) {
    result.push(left[i]);
    i++;
  }
  while (j < right.length) {
    result.push(right[j]);
    j++;
  }

  return result;
}

export function estimateComparisons(n) {
  if (n <= 1) return 0;
  const log2 = Math.ceil(Math.log2(n));
  return n * log2 - Math.pow(2, log2) + 1;
}
