/* -------------------------------------------------------------------------- */
/*                                  settings                                  */
/* -------------------------------------------------------------------------- */

const initialSettings = {
  unit: '3.81vmin', // unit size
  size: 21, // area side in units
  figs: 2, // sig figs for units
  nucleusColor: [0, 0, 40, 0.6], // cell center
  wobbleCellColor: [0, 0, 80, 0.6], // goo
  wobbleCellColorIfNoNucleus: [0, 0, 80, 0.7],
  backgroundColor: [200, 200, 200, 0.3], // background
  backgroundColorIfNoNucleus: [200, 200, 200, 0.4], // 0.16

  // LIFE LIFE LIFE
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

  // Acorn (https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life)
  // prettier-ignore
  // seed: (
  //   '000000000000000000000' +
  //   '000000000000000000000' +
  //   '000000000000000000000' +
  //   '000000000000000000000' +
  //   '000000001000000000000' +
  //   '000000000010000000000' +
  //   '000000011001110000000' +
  //   '000000000000000000000' +
  //   '000000000000000000000'
  // ),

  shiftX: 10, // hides divpen div
  shiftY: 10, // hides divpen div
  rndScale: 0.9, // fraction of wobble
  blurScale: 1 / 6,
  framesPerSecond: 12, // more here is big impact on cpu
  secondsPerStep: 3,
  bubbles: true,
  renderNucleus: false,
  wobbleTransition: '0.4s', // ~ wobble smoothness
  stepTransition: '0.2s' // ~ step change render
}
/* -------------------------------------------------------------------------- */
/*                                  settings end                              */
/* -------------------------------------------------------------------------- */

// state
let mouse, st

// initialize
const main = () => {
  mouse = JSON.parse(JSON.stringify(initialMouse))
  st = {
    ...JSON.parse(JSON.stringify(initialSettings)),
    step: 0,
    resizeTimer: null
  }

  initializePenCss()

  // start rendering loop (no transition on 1st frame)
  drawFrame(thisLife(st.seed).updateCss(1))

  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mousedown', handleMouseDown)
  window.addEventListener('mouseup', handleMouseUp)
  window.addEventListener('resize', handleResize)
  stopTransitionsOnResize()
}

// main loop
const drawFrame = async (ourLife, lastStep = Date.now()) => {
  // frame rate limit
  await new Promise(r => setTimeout(r, 1000 / st.framesPerSecond))

  // left mouse button down => new cells
  // right mouse button down => ded cells
  if (mouse.left) ourLife = ourLife.forceAlive(mouse.x, mouse.y)
  if (mouse.right) ourLife = ourLife.forceDead(mouse.x, mouse.y)

  if (!st.resizeTimer) {
    // keep track of seconds since last step
    if (Date.now() - lastStep > st.secondsPerStep * 1000) {
      // move the step up & update timer
      lastStep = Date.now()
      ourLife = ourLife.takeStep(++st.step).updateCss(2)
    } else {
      // just render regular wobble
      ourLife = ourLife.updateCss(0)
    }
  }

  window.requestAnimationFrame(() => drawFrame(ourLife, lastStep))
}

/* -------------------------------------------------------------------------- */
/*                         game of life state morphs                          */
/* -------------------------------------------------------------------------- */

const thisLife = (life = null) => {
  // deep copy life (takes too long)
  // if (life) life = JSON.parse(JSON.stringify(life))

  // init
  if (!life) {
    console.log('\n'.repeat(10), 'it starts... \n\n')
    const newLife = new Array(st.size * st.size).fill({
      alive: false,
      count: 0
    })
    return thisLife(newLife).updateAllCounts()
  }
  // init with seed
  if (typeof life === 'string') {
    console.log('\n'.repeat(10), 'it starts... \n\n')
    let lifeSeed = life.split('').map(v => +v)
    const newLife = new Array(st.size * st.size).fill({
      alive: false,
      count: 0
    })
    return thisLife(
      newLife.map((v, i) => ({
        count: 0,
        alive: lifeSeed[i] ? lifeSeed[i] === 1 : v.alive
      }))
    ).updateAllCounts()
  }

  // reset counts for all to 0
  const resetCounts = () => {
    life.forEach((_, i) => (life[i].count = 0))
    return thisLife(life)
  }

  // frands++
  const addToCount = (x, y) => {
    // make no changes if bad xy
    if (y >= st.size || x >= st.size || y < 0 || x < 0) return thisLife(life)
    // otherwise set state at index
    const index = y * st.size + x
    life[index].count += 1
    return thisLife(life)
  }

  // xy cell updates nearby frands
  const updateNearbyCounts = (x, y) => {
    if (isAlive(x, y)) {
      const posToUpdate = [
        [-1, -1],
        [0, -1],
        [1, -1],
        [-1, 0],
        [1, 0],
        [-1, 1],
        [0, 1],
        [1, 1]
      ]
      posToUpdate.forEach(delta => addToCount(x + delta[0], y + delta[1]))
    }
    return thisLife(life)
  }

  // get frands count at xy
  const getCount = (x, y) => {
    const index = y * st.size + x
    return life[index].count
  }

  // update counts of all cells
  const updateAllCounts = () => {
    resetCounts()
    for (let i = 0; i < life.length; i++) {
      const x = i % st.size
      const y = Math.floor(i / st.size)
      updateNearbyCounts(x, y)
    }
    return thisLife(life)
  }

  // check hp
  const isAlive = (x, y) => {
    // if outside range label as bad
    if (y >= st.size || x >= st.size || y < 0 || x < 0) return false
    // otherwise return state at index
    const index = y * st.size + x
    return life[index].alive
  }

  // rez
  const setAlive = (x, y) => {
    const inRange =
      x !== undefined &&
      y !== undefined &&
      !(y >= st.size || x >= st.size || y < 0 || x < 0)
    if (!inRange) return thisLife(life)
    const index = y * st.size + x
    life[index].alive = true
    return thisLife(life)
  }

  // nuke
  const setDead = (x, y) => {
    const inRange =
      x !== undefined &&
      y !== undefined &&
      !(y >= st.size || x >= st.size || y < 0 || x < 0)
    if (!inRange) return thisLife(life)
    const index = y * st.size + x
    life[index].alive = false
    return thisLife(life)
  }

  // set all lives from counts
  const updateToNextStepLives = () => {
    const newLife = new Array(life.length)
    for (let i = 0; i < life.length; i++) {
      const x = i % st.size
      const y = Math.floor(i / st.size)

      // fill new array for next step
      newLife[i] = { alive: isAliveNextStep(x, y), count: getCount(x, y) }
    }
    return thisLife(newLife)
  }

  // check if cell alive next step
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

  // print previous step log, update counts, advance step
  const takeStep = (step = 0) => {
    return thisLife(life)
      .printLog(`step ${step - 1}`)
      .updateAllCounts()
      .updateToNextStepLives()
  }

  // console log for more clear counts and positions
  const printLog = note => {
    console.log(
      life.reduce((view, cell, i) => {
        const newRowCheck = i % st.size === 0 ? '\n' : ''
        if (!cell) console.log(view, cell, i, life)
        const status = cell.alive ? cell.count : '.'
        return view + newRowCheck + status
      }, '') +
        '\n\n' +
        (note || '')
    )
    return thisLife(life)
  }

  const updateCss = (transitionType = 0) => {
    setPenCss(life, transitionType)
    return thisLife(life)
  }

  // for mouse forcing cell alive
  const forceAlive = (cx, cy) => {
    if (!cx || !cy) return thisLife(life) // abort if bad xy
    const x = Math.floor(cx)
    const y = Math.floor(cy)
    return setAlive(x, y) // it will abort if outside range
  }

  // for mouse foricng cell dead
  const forceDead = (cx, cy) => {
    if (!cx || !cy) return thisLife(life) // abort if bad xy
    const x = Math.floor(cx)
    const y = Math.floor(cy)
    return setDead(x, y)
  }

  return {
    addToCount,
    getCount,
    isAlive,
    life,
    resetCounts,
    thisLife,
    updateAllCounts,
    updateToNextStepLives,
    isAliveNextStep,
    updateNearbyCounts,
    takeStep,
    printLog,
    updateCss,
    setAlive,
    forceAlive,
    forceDead
  }
}

const getUnitInPx = unitToMeasureInPx => {
  const div = document.createElement('div')
  div.style.width = 'calc(1000 * ' + unitToMeasureInPx + ')'
  if (window.wrapper) window.wrapper.appendChild(div)
  const units1000 = +window.getComputedStyle(div).width.replace('px', '')
  div.outerHTML = '' // delete div completely
  return units1000 / 1000
}

/* -------------------------------------------------------------------------- */
/*                               event listeners                              */
/* -------------------------------------------------------------------------- */

const handleMouseMove = e => {
  updateMouseXY(e)
}

const handleMouseUp = e => {
  updateMouseXY(e)
  const [LEFT_MOUSE_BUTTON, RIGHT_MOUSE_BUTTON] = [0, 2]
  const { button } = e
  if (button === RIGHT_MOUSE_BUTTON) mouse.right = false
  if (button === LEFT_MOUSE_BUTTON) mouse.left = false
}

const handleMouseDown = e => {
  updateMouseXY(e)
  const [LEFT_MOUSE_BUTTON, RIGHT_MOUSE_BUTTON] = [0, 2]
  const { button } = e
  if (button === RIGHT_MOUSE_BUTTON) mouse.right = true
  if (button === LEFT_MOUSE_BUTTON) mouse.left = true
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
    !!mouse.pxUnit || (mouse.pxUnit = getUnitInPx(st.unit))

    // compensate for virtual units and pen size and scale
    mouse.x = +(pixelsX / mouse.pxUnit)
    mouse.y = +(pixelsY / mouse.pxUnit)
  }

  // console.log(mouse)
}

const handleResize = () => {
  mouse.pxUnit = getUnitInPx(st.unit)
}

const stopTransitionsOnResize = () => {
  const classes = document.body.classList
  window.addEventListener('resize', () => {
    if (st.resizeTimer) {
      clearTimeout(st.resizeTimer)
      st.resizeTimer = null
    } else classes.add('stop-transitions')
    st.resizeTimer = setTimeout(() => {
      classes.remove('stop-transitions')
      st.resizeTimer = null
    }, 300)
  })
}

const initialMouse = {
  x: null,
  y: null,
  left: null,
  right: null,
  unitPx: null
}

/* -------------------------------------------------------------------------- */
/*                          length and color helpers                          */
/* -------------------------------------------------------------------------- */

// cell coods => real css coods
const len = n => `calc(${(+n).toFixed(st.figs)} * ${st.unit})`

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
/*                                  css styles                                */
/* -------------------------------------------------------------------------- */

// set changing css for pen
const setPenCss = (life, transitionType = 0) => {
  let boxShadow = ''

  // alive on top
  for (let i = 0; i < life.length; i++) {
    // cells
    const cx = i % st.size
    const cy = Math.floor(i / st.size)

    // unit based position, corrected for shifts (to see shadow)
    const vx = cx + st.shiftX
    const vy = cy + st.shiftY

    const nucleusColor = color(st.nucleusColor).toString()
    const deadColor = color([0, 0, 0, 0]).toString()
    let wobbleCellColor = color(
      st.renderNucleus ? st.wobbleCellColor : st.wobbleCellColorIfNoNucleus
    ).toString()

    const wobbleSize = len(Math.random() * st.rndScale)
    const xWobble = len(vx + (Math.random() - 0.5) * st.rndScale)
    const yWobble = len(vy + (Math.random() - 0.5) * st.rndScale)
    // prevents patterns on dense pops
    const deadRadius = len(Math.random() - 0.5)

    // living cells
    if (life[i].alive) {
      boxShadow += st.renderNucleus
        ? // small nucleus
          `\t${xWobble} ${yWobble} 0 ${len(-0.1)} ${nucleusColor},\n`
        : ''
      boxShadow += `\t${xWobble} ${yWobble} 0 ${wobbleSize} ${wobbleCellColor},\n`
    }

    // keep same # of items same
    // to prevent order reorganizations and smooth transitions
    if (!life[i].alive) {
      boxShadow += st.renderNucleus
        ? `\t${len(vx)} ${len(vy)} 0 ${len(-1)} ${deadColor},\n`
        : ''

      boxShadow += `\t${len(vx)} ${len(vy)} 0 ${deadRadius} ${deadColor},\n`
    }
  }

  boxShadow += `
    ${len(st.size / 2 + st.shiftX)}
    ${len(st.size / 2 + st.shiftY)}
    0
    ${len(st.size * 10)}
    ${color(
      st.renderNucleus ? st.backgroundColor : st.backgroundColorIfNoNucleus
    ).toString()}
  `

  let transition = ''
  // wobble transition
  if (transitionType === 0)
    transition = `transition: box-shadow ${st.wobbleTransition};\n`
  // no transition (on loading the page)
  if (transitionType === 1) transition = 'transition: none;\n'
  // on step change death/birth
  if (transitionType === 2)
    transition = `transition: box-shadow ${st.stepTransition};\n`

  boxShadow = '\nbox-shadow:\n' + boxShadow.slice(0, -2) + ';\n' + transition

  updateHeader(`#divpen {` + boxShadow + `}`)
}

// set static css based on st
const initializePenCss = () => {
  // 3d translate caused edge blur here, not sure why, avoid.
  const basics =
    ` #divpen {
    width: ${len(1)};
    height: ${len(1)};
    transform: translate(${len(-st.shiftX)}, ${len(-st.shiftY)});
  ` +
    (st.bubbles
      ? `filter: blur(
        ${len(st.blurScale)}
        ) saturate(5) contrast(60) saturate(0.16);`
      : '') +
    '}'
  updateHeader(basics, 'penbasics')
}

// puts new style tag into header with css
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

/* -------------------------------------------------------------------------- */
/*                                   run it                                   */
/* -------------------------------------------------------------------------- */

main()
