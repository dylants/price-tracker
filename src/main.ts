import chalk from 'chalk';
import PriceFinder from 'price-finder';

export interface Item {
  name: string;
  previousPrice: number;
  url: string;
}

const priceFinder = new PriceFinder();
const log = console.log;

function getRandomArbitrary(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function getSleepTime() {
  return Math.floor(getRandomArbitrary(3, 9)) * 1000;
}

async function sleep(duration: number) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

async function printPrice({ name, previousPrice, url }: Item) {
  log(chalk.gray(`attempting to load price for ${name}...`));
  const price = await priceFinder.findItemPrice(url);
  log(chalk.gray(`${name} @ ${price}`));
  if (previousPrice && price !== undefined) {
    if (previousPrice > price) {
      log(chalk.greenBright('price dropped!'));
      log(chalk.cyanBright(name));
      log(chalk.yellowBright(`previous price: ${previousPrice}`));
      log(chalk.greenBright(`current price: ${price}`));
    } else if (previousPrice === price) {
      log(chalk.gray('same price'));
    } else {
      log(chalk.redBright('price increase!'));
      log(chalk.cyanBright(name));
      log(chalk.yellowBright(`previous price: ${previousPrice}`));
      log(chalk.redBright(`current price: ${price}`));
    }
  }
  const sleepTime = getSleepTime();
  log(chalk.gray(`sleeping for ${sleepTime}...`));
  await sleep(sleepTime);
  log(chalk.gray('...done sleeping'));
}

async function main() {
  log('');
  log('');

  let items: Item[] = [];
  try {
    // @ts-ignore: items file holds items to check
    items = (await import('../items')).default;
  } catch (error) {
    log(chalk.red('no items!'));
  }

  for (const item of items) {
    await printPrice(item);
  }
  log('');
  log(chalk.white('done'));
}

main();
