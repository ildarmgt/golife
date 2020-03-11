// @ts-nocheck

/* -------------------------------------------------------------------------- */
/*                                  settings                                  */
/* -------------------------------------------------------------------------- */

const settings = {
  unit: '4.3vmax', // unit size
  size: 21, // area side in units
  figs: 2, // sig figs for units
  nucleusColor: [0, 0, 40, 0.5], // cell center
  wobbleColor: [0, 0, 80, 0.5], // goo
  wobbleColorIfNoNucleus: [0, 0, 80, 0.7],
  deadColor: [200, 200, 200, 0.06], // background
  deadColorIfNoNucleus: [200, 200, 200, 0.16],
  // prettier-ignore
  seed: (
    '000000000000000000000' +
    '010000010011110011110' +
    '010000010010000010000' +
    '010000010010000010000' +
    '010000010011100011100' +
    '010000010010000010000' +
    '010000010010000010000' +
    '011110010010000011110' +
    '000000000000000000000'
  ).repeat(3),
  shiftX: 3, // hides divpen div
  shiftY: 3, // hides divpen div
  rndScale: 0.9, // fraction of wobble
  blurScale: 1 / 6,
  framesPerSecond: 9, // more here is big impact on cpu
  secondsPerStep: 5,
  bubbles: true,
  renderNucleus: false,
  wobbleTransition: '0.4s', // ~ wobble smoothness
  stepTransition: '0.15s', // ~ step change render
  /* -------------------------------------------------------------------------- */
  /*                                  settings end                              */
  /* -------------------------------------------------------------------------- */

  // tracking steps
  step: 0
}

const mouse = {
  x: null,
  y: null,
  unitPx: null
}

const main = () => {
  console.log('\n\n it starts... \n\n')

  initializePenCss()

  // start rendering with first frame no transitions
  drawFrame(thisLife(settings.seed).updateCss(true))

  window.addEventListener('mousemove', updateMouseXY)
  window.addEventListener('mousedown', updateMouseXY)
  window.addEventListener('mouseup', updateMouseXY)
  window.addEventListener('resize', handleResize)
}

const updateMouseXY = e => {
  if (window.wrapper) {
    const box = window.wrapper.getBoundingClientRect()
    // subpixel precise. for divs there's also scrollTop
    const scrolledY = window.scrollY
    const pixelsX = e.pageX - box.left
    const pixelsY = e.pageY - box.top - scrolledY

    // now need to convert to used coordinates

    // get 1 unit in pixels if don't have yet
    !!mouse.pxUnit || (mouse.pxUnit = getUnitInPx(settings.unit))

    // compensate for virtual units and pen size and scale
    mouse.x = +(pixelsX / mouse.pxUnit)
    mouse.y = +(pixelsY / mouse.pxUnit)
  }

  // console.log(mouse)
}

const handleResize = () => {
  mouse.pxUnit = getUnitInPx(settings.unit)
}

// main loop
const drawFrame = async (ourLife, lastStep = Date.now()) => {
  // frame rate limit
  await new Promise(r => setTimeout(r, 1000 / settings.framesPerSecond))

  ourLife = ourLife.forceAlive(mouse.x, mouse.y)

  // keep track of seconds since last step
  if (Date.now() - lastStep > settings.secondsPerStep * 1000) {
    // move the step up & update timer
    lastStep = Date.now()
    ourLife = ourLife.takeStep()
    ourLife = ourLife.updateCss(2)
  } else {
    // just render regular wobble
    ourLife = ourLife.updateCss()
  }

  // update css to draw cells
  window.requestAnimationFrame(() => drawFrame(ourLife, lastStep))
}

// cell oods => real css coods
const len = n => `calc(${(+n).toFixed(settings.figs)} * ${settings.unit})`

// mix or convert to css format colors
const color = (a, b = a, amt = 0.0) => {
  const c = []
  for (let i = 0; i < a.length; i++) {
    c.push(b[i] === a[i] ? a[i] : amt * (b[i] - a[i]) + a[i])
  }

  return {
    toString: () =>
      `rgba(${c[0].toFixed(0)}, ${c[1].toFixed(0)}, ${c[2].toFixed(
        0
      )}, ${(c[3] !== undefined ? c[3] : 1.0).toFixed(3)})`,
    toArray: () => c
  }
}

/* -------------------------------------------------------------------------- */
/*                           pen css from life array                          */
/* -------------------------------------------------------------------------- */

// set changing css for pen
const setPenCss = (life, simple = false) => {
  let boxShadow = ''

  // alive on top
  for (let i = 0; i < life.length; i++) {
    // cells
    const cx = i % settings.size
    const cy = Math.floor(i / settings.size)
    // unit based position, corrected for shifts (to see shadow)
    const vx = cx + settings.shiftX
    const vy = cy + settings.shiftY
    const nucleusColor = color(settings.nucleusColor).toString()
    const deadColor = color(
      settings.renderNucleus
        ? settings.deadColor
        : settings.deadColorIfNoNucleus
    ).toString()
    const wobbleColor = color(
      settings.renderNucleus
        ? settings.wobbleColor
        : settings.wobbleColorIfNoNucleus
    ).toString()
    const wobbleSize = len(0 + Math.random() * settings.rndScale)
    const xWobble = len(vx + (Math.random() - 0.5) * settings.rndScale)
    const yWobble = len(vy + (Math.random() - 0.5) * settings.rndScale)
    // living cells
    if (life[i].alive) {
      boxShadow += settings.renderNucleus
        ? `\t${len(vx)} ${len(vy)} 0 ${len(0)} ${nucleusColor},\n`
        : ''
      boxShadow += `\t${xWobble} ${yWobble} 0 ${wobbleSize} ${wobbleColor},\n`
    }

    // dead cells for contrast, keep same # of items
    // to prevent order reorganizations and smooth transitions
    if (!life[i].alive) {
      boxShadow += settings.renderNucleus
        ? `\t${len(vx)} ${len(vy)} 0 ${len(0.5)} ${deadColor},\n`
        : ''

      boxShadow += `\t${len(vx)} ${len(vy)} 0 ${len(0.5)} ${deadColor},\n`
    }
  }

  let transition = ''
  // wobble transition
  if (simple == 0)
    transition = `transition: box-shadow ${settings.wobbleTransition};\n`
  // no transition on loading the page
  if (simple == 1) transition = 'transition: none;\n'
  // on step change fade out is ugly so speed it up
  if (simple == 2)
    transition = `transition: box-shadow ${settings.stepTransition};\n`

  boxShadow = '\nbox-shadow:\n' + boxShadow.slice(0, -2) + ';\n' + transition

  updateHeader(`#divpen {` + boxShadow + `}`)
}

// set constant css for pen
const initializePenCss = () => {
  // 3d translate caused edge blur here, not sure why, avoid.
  const basics =
    ` #divpen {
    will-change: box-shadow, filter;
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    width: ${len(1)};
    height: ${len(1)};
    background-color: rgba(255, 255, 255, 0);
    pointer-events: none;
    border-radius: 100%;
    transform: translate(${len(-settings.shiftX)}, ${len(-settings.shiftY)});
  ` +
    (settings.bubbles
      ? `filter: blur(
        ${len(settings.blurScale)}
        ) saturate(5) contrast(40) saturate(0.16);`
      : '') +
    '}'

  updateHeader(basics, 'penbasics')
}

const updateHeader = (cssString, forWho = 'divpen') => {
  // remove old style
  if (window.for_divpen) {
    window['for_' + forWho].outerHTML = ''
  }

  // attach new style to header
  const styleEl = document.createElement('style')
  styleEl.type = 'text/css'
  styleEl.id = 'for_' + forWho
  styleEl.appendChild(document.createTextNode(cssString))
  document.head.appendChild(styleEl)
}

const thisLife = (life = null) => {
  // git init
  if (!life) {
    const newLife = new Array(settings.size * settings.size).fill({
      alive: false,
      count: 0
    })
    return thisLife(newLife)
  }

  if (typeof life === 'string') {
    let lifeSeed = life
      .repeat(10)
      .split('')
      .map(v => +v)
    const newLife = new Array(settings.size * settings.size).fill({
      alive: false,
      count: 0
    })
    return thisLife(
      newLife.map((v, i) => ({
        count: 0,
        alive: lifeSeed[i] ? lifeSeed[i] === 1 : v.alive
      }))
    )
  }

  // reset counts to 0
  const resetCounts = () => {
    life.forEach((_, i) => (life[i].count = 0))
    return thisLife(life)
  }

  // frands++
  const addToCount = (x, y) => {
    // make no changes if bad xy
    if (y >= settings.size || x >= settings.size || y < 0 || x < 0)
      return thisLife(life)
    // otherwise set state at index
    const index = y * settings.size + x
    life[index].count += 1
    return thisLife(life)
  }

  // hey y'all
  const updateNearbyCounts = (x, y) => {
    if (isAlive(x, y)) {
      ;[
        [-1, -1],
        [0, -1],
        [1, -1],
        [-1, 0],
        [1, 0],
        [-1, 1],
        [0, 1],
        [1, 1]
      ].forEach(delta => addToCount(x + delta[0], y + delta[1]))
    }
    return thisLife(life)
  }

  // count frands
  const getCount = (x, y) => {
    const index = y * settings.size + x
    return life[index].count
  }

  // add to surrounding cells from 1 or 0
  const updateAllCounts = () => {
    resetCounts()
    for (let i = 0; i < life.length; i++) {
      const x = i % settings.size
      const y = Math.floor(i / settings.size)
      updateNearbyCounts(x, y)
    }
    return thisLife(life)
  }

  // u there?
  const isAlive = (x, y) => {
    // if outside range label as bad
    if (y >= settings.size || x >= settings.size || y < 0 || x < 0) return null
    // otherwise return state at index
    const index = y * settings.size + x
    return life[index].alive
  }

  const setAlive = (x, y) => {
    if (y >= settings.size || x >= settings.size || y < 0 || x < 0)
      return thisLife(life)
    const index = y * settings.size + x
    life[index].alive = true
    return thisLife(life)
  }

  // use counts of each cell to change its living
  const updateAllLives = () => {
    const newLife = []
    for (let i = 0; i < life.length; i++) {
      const x = i % settings.size
      const y = Math.floor(i / settings.size)

      newLife.push({ alive: isAliveNextStep(x, y), count: getCount(x, y) })
    }
    return thisLife(newLife)
  }

  // cells doing cell things
  const isAliveNextStep = (x, y) => {
    const thisCount = getCount(x, y)
    const thisAlive = isAlive(x, y)
    if (thisAlive) {
      if (thisCount < 2 || thisCount > 3) return false // ded
    } else {
      if (thisCount === 3) return true // liv
    }
    return thisAlive // no change
  }

  const takeStep = () => {
    return thisLife(life)
      .updateAllCounts()
      .printLog(`step ${settings.step++}`)
      .updateAllLives()
  }

  const printLog = note => {
    console.log(
      life.reduce((view, cell, i) => {
        const newRowCheck = i % settings.size === 0 ? '\n' : ''
        if (!cell) console.log(view, cell, i, life)
        const status = cell.alive ? cell.count : '.'
        return view + newRowCheck + status
      }, '') +
        '\n\n' +
        (note || '')
    )
    return thisLife(life)
  }

  const updateCss = (simple = false) => {
    setPenCss(life, simple)
    return thisLife(life)
  }

  // for mouse foricng cell alive, not sure if need special
  const forceAlive = (cx, cy) => {
    if (!cx || !cy) return thisLife(life)
    const x = Math.floor(cx)
    const y = Math.floor(cy)
    return setAlive(x, y) // it will abort if outside range
  }

  return {
    addToCount,
    getCount,
    isAlive,
    life,
    resetCounts,
    thisLife,
    updateAllCounts,
    updateAllLives,
    isAliveNextStep,
    updateNearbyCounts,
    takeStep,
    printLog,
    updateCss,
    setAlive,
    forceAlive
  }
}

const getUnitInPx = unitToMeasureInPx => {
  const div = document.createElement('div')
  div.style.width = 'calc(1000 * ' + unitToMeasureInPx + ')'
  window.wrapper.appendChild(div)
  const units1000 = +window.getComputedStyle(div).width.replace('px', '')
  div.outerHTML = '' // delete div completely
  return units1000 / 1000
}

// disable transitions on resize because looks bad
;(() => {
  const classes = document.body.classList
  let timer = 0
  window.addEventListener('resize', () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    } else classes.add('stop-transitions')
    timer = setTimeout(() => {
      classes.remove('stop-transitions')
      timer = null
    }, 100)
  })
})()

// run program
main()
