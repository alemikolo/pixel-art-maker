$(document).ready(pixelArtMaker);

function pixelArtMaker() {
  // Gets DOM elements
  const pixelCanvas = $('#pixel-canvas');
  const pixelCanvasInputHeight = $('#input-height');
  const pixelCanvasInputWidth = $('#input-width');
  const wrapper = $('#artboard-wrapper');
  const artboard = $('#artboard');
  const undo = $('#undo');
  const redo = $('#redo');
  const brushTool = $('#brush');
  const eraseTool = $('#erase');
  const eyedropperTool = $('#eyedropper');
  const appLayout = $('#general, .toolbar, #artboard-wrapper');
  const mainColorPicker = $('#color-picker');
  const colorborders = $('#color-borders');
  const bgColor = $('#bg-color');
  const bdColor = $('#bd-color');
  const tlColor = $('#tl-color');
  const cellSizeInput = $('#cell-sizer');
  const borderSwitch = $('#switch-borders');

  // Captures initial values from DOM elements
  const initialBrushColor = mainColorPicker.val();
  const initialBackgroundColor = '#ffffff';
  const initialBorderColor = '#d3d3d3';
  const initialColsNumber = pixelCanvasInputWidth.val();
  const initialRowsNumber = pixelCanvasInputHeight.val();
  const initialCellDimension = cellSizeInput.val();
  const initialColor = mainColorPicker.val();

  // Sets current values based on initial values
  let colsNumber = initialColsNumber;
  let rowsNumber = initialRowsNumber;
  let cellDimension = initialCellDimension;
  let brushColor = initialColor;
  let backgroundColor = initialBackgroundColor;
  let borderColor = initialBorderColor;
  let mainColor = initialColor;
  let displayBorders = true;

  // Variables to redo and undo features
  const numberOfUndos = 20;
  const modyfiedCells = [];
  const actionsUndoHistory = [];
  const actionsRedoHistory = [];
  let redoEnabled = false;
  let undoEnabled = false;

  // Variables
  let originalCellColor;
  let currentTool = '';
  const toolToggles = {
    brush: toggleBrushTool,
    erase: toggleEraseTool,
    eyedropper: toggleEyedropperTool,
    fill: toggleFillTool,
    line: toggleShapeTool,
    circle: toggleShapeTool,
    rectangle: toggleShapeTool
  }

  // ALl cells collection
  const cellCollection = [];

  // Draws initial grid
  makeGrid(rowsNumber, colsNumber);



  //////////////////// NEW CANVAS FEATURE ////////////////////
  // Resets canvas to initial state
  $('#new-canvas').on('click', function resetPainter() {
    backgroundColor = initialBackgroundColor;
    brushColor = initialBrushColor;
    borderColor = initialBorderColor;
    mainColor = initialColor;
    colsNumber = initialColsNumber;
    rowsNumber = initialRowsNumber;
    cellDimension = initialCellDimension;

    cellSizeInput[0].value = cellDimension;
    mainColorPicker[0].value = mainColor;
    pixelCanvasInputHeight.val(rowsNumber);
    pixelCanvasInputWidth.val(colsNumber);

    makeGrid(rowsNumber, colsNumber);
    resetActionsHistory();
    bgColor.css('background-color', backgroundColor);
    bdColor.css('background-color', borderColor);
    tlColor.css('background-color', mainColor);
  });



  //////////////////// PRINT FEATURE ////////////////////
  // Open print dialog
  $('#print').on('click', function printPainting(event){
    event.preventDefault();
    createTemporaryImage('print');
  });



  //////////////////// SAVE FEATURE ////////////////////
  // Saves painting as png
  $('#save').on('click', function saveImageHandler(event) {
    event.preventDefault();
    createTemporaryImage('save');
  });



  //////////////////// SAVE AND PRINT COMMON FEATURE ////////////////////
  /**
   * @description Prepares image with svg data for canvas (needed for printing and saving)
   * @param {string} feature - name of feature that requests the image; available values: 'print' and 'save
   */
  function createTemporaryImage(feature) {
    const strokeWidth = 1;
    const correctedCellDimensionWidth = cellDimension - strokeWidth*3;
    const correctedCellDimensionHeight = cellDimension - strokeWidth*3;
    const correctedCanvasWidth = cellDimension*colsNumber+strokeWidth;
    const correctedCanvasHeight = cellDimension*rowsNumber+strokeWidth;

    const canvas = createTempCanvas(correctedCanvasWidth, correctedCanvasHeight);
    const pixelCanvasCopy = createPixelCanvasCopy(correctedCellDimensionWidth, correctedCellDimensionHeight);
    const svgData = prepareSvgData(pixelCanvasCopy.prop('outerHTML'), correctedCanvasWidth, correctedCanvasHeight);
    const canvasContext = canvas.getContext('2d');
    const saveLink = document.getElementById('save-link');

    const img = new Image();
    img.onload = function() {
      canvasContext.drawImage(img, 0, 0);
      if (feature === 'print') {
        $('#forPrint').html(img);
        window.print();
        $('body').one('click', function (){
          $('#forPrint').html('');
        });
      } else if (feature === 'save') {
        saveLink.setAttribute('href', canvas.toDataURL('image/png'));
        saveLink.click();
      }
    };

    img.src = svgData;
  }

  /**
   * @description Prepares svg data with canvas (needed for saving as image)
   * @param {string} canvasHTML
   * @param {number} width
   * @param {number} height
   * @return {string}
   */
  function prepareSvgData(canvasHTML, width, height) {
    const data = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="'+ width +'" height="'+ height +'">' +
    '<foreignObject width="100%" height="100%">' +
    '<div xmlns="http://www.w3.org/1999/xhtml">' +
    canvasHTML +
    '</div>' +
    '</foreignObject>' +
    '</svg>';
    return data;
  }

  /**
   * @description Creates pixelCanvas copy with inline styles
   * @param {number} cellWidth
   * @param {number} cellHeight
   * @return {object}
   */
  function createPixelCanvasCopy(cellWidth, cellHeight) {
    const pixelCanvasCopy =  pixelCanvas.clone(true);
    pixelCanvasCopy.css('border-collapse','collapse');
    pixelCanvasCopy.find('td').css({
      'width': cellWidth,
      'height': cellHeight,
			'max-width': cellWidth,
			'max-height': cellHeight,
			'min-height': cellHeight,
			'min-width': cellWidth
    });
    if(displayBorders) {
      pixelCanvasCopy.find('td').css('border', '1px solid '+ borderColor);
    } else {
      // When using HTML inside svg there are strange problems without cell borders
      pixelCanvasCopy.find('td').css('border', '1px solid transparent');
    }
    return pixelCanvasCopy;
  }

  /**
   * @description Creates temporary canvas needed for saving as image
   * @param {number} width
   * @param {number} height
   * @return {object}
   */
  function createTempCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('id', 'canvas');
    canvas.setAttribute('width', width);
    canvas.setAttribute('height', height);
    return canvas;
  }



  //////////////////// HELP FEATURES ////////////////////
  // Show help Modal
  $('#help').on('click', function showHelpModal() {
    $('#helpModal').addClass('showModal');
  });

  // Hide help Modal
  $('#closeModal').on('click', function hideHelpModal() {
    $('#helpModal').removeClass('showModal');
  });



  //////////////////// UNDO REDO FEATURES ////////////////////
  // Undo last painting action
  undo.on('click', function undoLastActionHandler() {
    const lastAction = actionsUndoHistory.pop();
    for (let i = 0; i < lastAction.changedCells.length; i++) {
      const tdSelector = '#' + lastAction.changedCells[i].id;
      const cell = pixelCanvas.find(tdSelector);
      const newBackgroundColor = lastAction.changedCells[i].oldBackground;
      cellPainter(cell[0], newBackgroundColor);
    }
    if (lastAction.action === 'background') {
      backgroundColor = lastAction.changedCells[0].oldBackground;
    }
    actionsRedoHistory.push(lastAction);
    setRedo(true);
    if (actionsUndoHistory.length == 0) {
      setUndo(false);
    }
  });

  // Redo last undo actions
  redo.on('click', function redoLastActionHandler() {
    const lastAction = actionsRedoHistory.pop();
    for (let i = 0; i < lastAction.changedCells.length; i++) {
      const tdSelector = '#' + lastAction.changedCells[i].id;
      const cell = pixelCanvas.find(tdSelector);
      const newBackgroundColor = lastAction.changedCells[i].newBackground;
      cellPainter(cell[0], newBackgroundColor);
    }
    if (lastAction.action === 'background') {
      backgroundColor = lastAction.changedCells[0].newBackground;
    }
    actionsUndoHistory.push(lastAction);
    setUndo(true);
    if (actionsRedoHistory.length == 0) {
      setRedo(false);
    }
  });

  /**
   * @description Sets redoEnabled variable and toogles disable attribiute on redo button
   * @param {boolean} value
   */
  function setRedo(value) {
    if (value !== redoEnabled) {
      redoEnabled = value;
      redo.prop('disabled', !redoEnabled);
    }
  }

  /**
   * @description Sets undoEnabled variable and toogles disable attribiute on undo button
   * @param {boolean} value
   */
  function setUndo(value) {
    if (value !== undoEnabled) {
      undoEnabled = value;
      undo.prop('disabled', !undoEnabled);
    }
  }

  /**
   * @description Checks if cell was registered in this actions
   * @param {boolean} cellId
   * @return {boolean}
   */
  function isNotRegistered(cellId) {
    let registerCell = true;
    if (modyfiedCells.length > 0) {
      modyfiedCells.find(function findIfCellIsRegistered(element) {
        if (element.id === cellId) {
          registerCell = false;
        }
      });
    }
    return registerCell
  }

  /**
   * @description Saves id and background color of modyfied cells
   */
  function startRegisterCell(coloredCell, newColor) {
    const currentCell = $(coloredCell);
    const currentCellId = currentCell.attr('id');
    const backgroundToRegister = currentCell.css('background-color');
    // Clear redo history
    actionsRedoHistory.length = 0;
    setRedo(false);
    if (isNotRegistered(currentCellId)) {
      const cellData = {
        id: currentCell.attr('id'),
        oldBackground: backgroundToRegister,
        newBackground: newColor
      };

      modyfiedCells.push(cellData);
    }
  }

  /**
   * @description Saves as an object modyfied cells and curret brush color
   * @param {string} currentAction - checks kind of modyfication
   */
  function registerAction(currentAction) {
    const action = {
      changedCells: modyfiedCells.slice(0),
      action: currentAction
    };
    if(actionsUndoHistory.length >= numberOfUndos) {
      actionsUndoHistory.shift();
    }
    actionsUndoHistory.push(action);
    modyfiedCells.length = 0;
    setUndo(true);
  }

  /**
   * @description Resets undo and redo features
   */
  function resetActionsHistory() {
    actionsUndoHistory.length = 0;
    actionsRedoHistory.length = 0;
    setUndo(false);
    setRedo(false);
  }

  // Registers modyfying cell on register event
  pixelCanvas.on('register', function(event, newColor){
    startRegisterCell(event.target, newColor);
  });

  // Saves firs action on actionStop event
  pixelCanvas.on('actionStop', function(event, action){
    if (modyfiedCells.length>0) {
      registerAction(action);
    }
  });



  //////////////////// DRAW GRID FEATURES ////////////////////
  cellSizeInput.on('change', function setCellDimension() {
    cellDimension = $(this).val();
    setCellSize(cellDimension);
    artboard.mCustomScrollbar('destroy');
    turnOnScrollbars();
    centerVerticallyOrScrollbarY();
  });

  /**
   * @description Sets size of pixel-art's square cells
   * @param {number} cellDimension
   */
  function setCellSize(cellDimension) {
    pixelCanvas.find('td').css({
      'width': cellDimension +'px',
      'height': cellDimension +'px',
      'min-width': cellDimension +'px',
      'max-width': cellDimension +'px',
      'min-height': cellDimension +'px'
    });
    pixelCanvas.find('tr').css({
      'height': cellDimension +'px',
      'min-height': cellDimension +'px',
      'max-height': cellDimension +'px'
    });
  }

  /**
   * @description Draws grid
   * @param {number} height - number of rows
   * @param {number} width - number of columns
   */
  function makeGrid(height, width) {
    let grid = '';
    let cellId = '';
    const tdStyle =
      'style="width: '
      + cellDimension
      + 'px; max-width: '
      + cellDimension
      + 'px; min-width: '
      + cellDimension + 'px;"';
    const trStyle = 'style="height:'+ cellDimension +'px;"';
    for (let row = height; row >= 1; row--) {
      cellCollection[row-1] = [];
      grid += '<tr ' + trStyle + '>';
      cellId = 'y'+row;
      for (let col = 1; col <= width; col++) {
        cellId = cellId + 'x'+col;
        grid += '<td id="'+cellId+'" data-y="'+row+'" data-x="'+col+'" ' + tdStyle + '></td>';
        cellId = 'y'+row;
      }
      grid += '</tr>';
    }
    pixelCanvas.html(grid);
    cellBorderSwitch(true);
    pixelCanvas.find('td').each(function(index, element) {
      $(element).css({
        'border-color': borderColor,
        'background-color': backgroundColor
      });
      cellCollection[rowsNumber-1-Math.floor(index/width)].push($(element));

    });

    artboard.mCustomScrollbar('destroy');
    turnOnScrollbars();
    centerVerticallyOrScrollbarY();
  }

  // Ensures that height and width will match the min and max attributes
  $('#input-width, #input-height').on('blur', function dimensionValidatorHandler() {
    const min = Number($(this).attr('min'));
    const max = Number($(this).attr('max'));

    if (Number($(this).val()) < min) {
      $(this).val(min);
    }
    if (Number($(this).val()) > max) {
      $(this).val(max);
    }
  });

  // Creates the grid based on entered values, when grid size is submitted
  $('#draw-grid').on('click', function setDimensionsHandler(event) {
    event.preventDefault();
    colsNumber = pixelCanvasInputWidth.val();
    rowsNumber = pixelCanvasInputHeight.val();
    resetActionsHistory();
    makeGrid(rowsNumber, colsNumber);
  });

  /**
   * @description Centers canvas vertically
   */
  function centerVerticallyOrScrollbarY() {
    const artboardHeight = artboard.height();
    const canvasHeight = pixelCanvas.height();
    if (artboardHeight > canvasHeight ) {
      $('.mCSB_container').addClass('vertical-aligner');
    } else {
      $('.mCSB_container').removeClass('vertical-aligner');
    }
  }

  // Aligns canvas vertically on window resize event
  $(window).on('resize', function() {
    centerVerticallyOrScrollbarY();
  });

  // Aligns canvas vertically on canvas resize event
  pixelCanvas.on('resize', function() {
    centerVerticallyOrScrollbarY();
  });



  //////////////////// CELL BORDERS FEATURES ////////////////////
  // Sets border color on button color borders
  colorborders.on('click', function borderColorChangeHandler() {
    borderColor = mainColor;
    pixelCanvas.find('td').css('border-color', borderColor);
    bdColor.css('background-color', borderColor);
  });

   // Hides or shows cell borders
   $('#switch-borders').on('click', function cellBorderSwitchHandler(){
    cellBorderSwitch(!displayBorders);
   });

   /**
   * @description Controls displaying of borders
   * @param {boolean} ifDisplay
   */
   function cellBorderSwitch(ifDisplay) {
    displayBorders = ifDisplay;
    if (!displayBorders) {
      pixelCanvas.find('td').removeClass('bordered-cells');
      borderSwitch.attr('title', 'Show borders.');
      borderSwitch.find('img').attr('src', 'img/icons/borders_on.svg');
    } else {
      pixelCanvas.find('td').addClass('bordered-cells');
      borderSwitch.attr('title', 'Hide borders.');
      borderSwitch.find('img').attr('src', 'img/icons/borders_off.svg');
    }
  }


  //////////////////// BACKGROUND COLOR FEATURES ////////////////////
  // Changes cell background color on fill button click
  $('#color-background').on('click', function canvasBbackgroundColorChangeHandler() {
    cellBackgroundChanger(backgroundColor, mainColor);
  });

  // Clean background color on button click
  $('#clean-background').on('click', function cellBackgroundCleanHandler() {
    cellBackgroundChanger(backgroundColor, initialBackgroundColor);
  });

  /**
   * @description Changes color of cells from one to another
   * @param {string} oldColor
   * @param {string} newColor
   */
  function cellBackgroundChanger(oldColor, newColor){
    let counter = 0;
    pixelCanvas.find('td').each(function filterCellsWithOldBackground(index, el) {
      if (rgb2hex($(el).css('background-color')) === oldColor) {
        $(el).trigger('register',[newColor]);
        cellPainter(el, newColor);
        counter++;
      }
    });
    if (counter > 0) {
      backgroundColor = newColor;
      bgColor.css('background-color', backgroundColor);
    }

    pixelCanvas.trigger('actionStop',['background']);
  }



  //////////////////// TOOLS GENERAL AND COMMON FEATURES ////////////////////
  // Sets main color value on colorPicker change
  mainColorPicker.on('change', function colorChangeHandler() {
    mainColor = $(this).val();
    updateToolColorStatus(mainColor);
  });

  // Sets swatch color as a main color
  $('.swatch').on('click', function setSwatchColorAsMainColor() {
    const newColor = rgb2hex($(this).css('background-color'));
    mainColorPicker.val(newColor);
    mainColor = newColor;
    updateToolColorStatus(mainColor);
  })

  /**
   * @description Updates tool color on status bar
   * @param {string} color
   */
	function updateToolColorStatus(color) {
		if (currentTool) {
      if (toolToggles[currentTool] !== undefined && currentTool !== 'erase' && currentTool !== 'eyedropper') {
				tlColor.css('background-color', color);
      }
    }
	}

  // Runs tools: brush, erase, fill, line, circle, rectangle or eyedropper
  $('.tool').on('click', function onToolClickHandler(event) {
    // Stop current tool
    if (currentTool) {
      wrapper.removeClass(currentTool + '-cursor');
      $('#'+currentTool).removeClass('active-tool');
      toolToggles[currentTool](false);
    }

    // Sets and runs requested tool
    currentTool = $(event.currentTarget).attr('id');
    if (currentTool) {
      if (toolToggles[currentTool] !== undefined) {
        tlColor.css('background-color', mainColor);
        wrapper.addClass(currentTool + '-cursor');
        $(this).addClass('active-tool');
        toolToggles[currentTool](true);
      } else {
        currentTool = '';
      }
    }
    updateToolColorStatus(mainColor);
  });



  //////////////////// FILL FEATURE ////////////////////
  /**
   * @description Toggles fill tool
   * @param {boolean} toolState
   */
  function toggleFillTool(toolState) {
    const toggleMethod = (toolState) ? 'on' : 'off';
    pixelCanvas[toggleMethod]('click', 'td', fillHandler);
  }

  /**
   * @description fills the same cells in the neighborhood
   * @param {boolean} toolState
   */
  function fillHandler(event) {
    event.preventDefault();
    const newColor = mainColor;
    const cells = findCells(event.target);
    cells.forEach(function fillSameCells(cell, index) {
      $(cell).trigger('register', [newColor]);
      cellPainter(cell, newColor);
    });
    pixelCanvas.trigger('actionStop');
  }

  /**
   * @description finds the same cells in the neighborhood
   * @param {string} cell
   * @return {array}
   */
   function findCells(cell) {
    // in some places jQuery object is needed
    const cellJQ = $(cell);
    const currentBackgroundColor = cellJQ.css('background-color');
    const checkedCells = [];
    const finalArea = [];
    const cellToCheckNeighbors = [];
    for (let i=0; i<rowsNumber; i++) {
      checkedCells[i] = [];
    }
    function findNewSameColoredCell(currentCell) {
      const neighbors = findNeighbors(currentCell, checkedCells);
      neighbors.forEach(function addSameNeighbors(neighbor, index) {
      if (neighbor.css('background-color') === currentBackgroundColor) {
        cellToCheckNeighbors.push(neighbor);
        finalArea.push(neighbor[0]);
        checkedCells[Number(neighbor.attr('data-y')-1)][Number(neighbor.attr('data-x')-1)] = true;
      }
      });
    }
    finalArea.push(cell);
    checkedCells[Number(cellJQ.attr('data-y')-1)][Number(cellJQ.attr('data-x')-1)] = true;
    cellToCheckNeighbors.push(cellJQ);
    while (cellToCheckNeighbors.length > 0) {
      const tempCell = cellToCheckNeighbors.pop();
      findNewSameColoredCell(tempCell);
    }

    return finalArea;
  }

  /**
   * @description finds immediate cell neighbors
   * @param {string} currentCell
   * @return {array}
   */
  function findNeighbors(currentCell, checkedCells) {
    const xCoord = Number(currentCell.attr('data-x'));
    const yCoord = Number(currentCell.attr('data-y'));
    // Coords for finding cell in cellCollection array
    const x = xCoord-1;
    const y = yCoord-1;
    const neighbors = [];

    if ((y+1 < rowsNumber) && !checkedCells[y+1][x]) {
      neighbors.push(cellCollection[y+1][x]);
    }
    if ((x+1 < colsNumber) && !checkedCells[y][x+1]) {
      neighbors.push(cellCollection[y][x+1]);
    }
    if ((y-1 >= 0) && !checkedCells[y-1][x]) {
      neighbors.push(cellCollection[y-1][x]);
    }
    if ((x-1 >= 0) && !checkedCells[y][x-1]) {
      neighbors.push(cellCollection[y][x-1]);
    }
    return neighbors;
  }



  //////////////////// BRUSH FEATURE ////////////////////
  // Clears painting
  $('#paint-cleaner').on('click', function cellBrushCleanHandler() {
    pixelCanvas.find('td').each(function paintingCleaner(index, el) {
      if (rgb2hex($(el).css('background-color')) !== backgroundColor) {
        $(el).trigger('register',[backgroundColor]);
        cellPainter(el, backgroundColor);
      }
    });
    pixelCanvas.trigger('actionStop',['clear']);
  });

  /**
   * @description Toggles brush tool
   * @param {boolean} toolState
   */
  function toggleBrushTool(toolState) {
    const toggleMethod = (toolState) ? 'on' : 'off';
    pixelCanvas[toggleMethod]('mousedown', 'td', startPaintingHandler);
    pixelCanvas[toggleMethod]('mouseenter mouseleave', 'td', brushPreviewHandler);
    pixelCanvas[toggleMethod]('actionStart', 'td', toggleBrushPreviewHandler);
    pixelCanvas[toggleMethod]('actionStop', toggleBrushPreviewHandler);
  }

  /**
   * @description Toggles brush preview
   */
  function toggleBrushPreviewHandler(event) {
    if (event.type === 'actionStart') {
      // we have to restore true (original) background color of the cell,
      // because in this moment it's changed by preview feature
      $(this).css({
        'background-color': originalCellColor
      });
      pixelCanvas.off('mouseenter mouseleave', 'td', brushPreviewHandler);
    } else if (event.type === 'actionStop') {
      // we have to manually set originalCellColor, because until now
      // preview feature was off and this variable is outdated
      originalCellColor = mainColor;
      pixelCanvas.on('mouseenter mouseleave', 'td', brushPreviewHandler);
    }
  }

  /**
   * @description Turns on brush preview
   * @param {object} event
   */
  function brushPreviewHandler(event) {
    let color = originalCellColor;
    if(event.type === 'mouseenter') {
      originalCellColor = $(this).css('background-color');
      color = mainColor;
    }
    $(this).css({
      'background-color': color
    });
  }

  /**
   * @description paints cell
   * @param {string} cellToPaint - cell
   * @param {string} color - new color
   */
  function cellPainter(cellToPaint, color) {
    $(cellToPaint).css('background-color', color);
  }

  /**
   * @description Changes color of the grid cell
   * @param {object} event
   */
  function paintHandler(event) {
    event.preventDefault();
    const newColor = (currentTool === 'erase') ? backgroundColor : mainColor;
    $(event.target).trigger('register', [newColor]);
    cellPainter(event.target, newColor);
  }

  // Starts painting
  function startPaintingHandler(event) {
    event.preventDefault();
    $(event.target).trigger('actionStart');

    // Paints current cell and additionally starts handling painting on mouseover event
    paintHandler(event);
    pixelCanvas.on('mouseover', 'td', paintHandler);

    // Stops painting on mouseup or mouseleave event
    $('body').on('mouseup mouseleave', stopPaintingHandler);
  }

  /**
   * @description Stop painting handler
   * @param {object} event
   */
  function stopPaintingHandler(event) {
      event.preventDefault();
    $('body').off('mouseup mouseleave', stopPaintingHandler);
      pixelCanvas.off('mouseover', 'td', paintHandler);
      pixelCanvas.trigger('actionStop', [currentTool]);
  }



  //////////////////// ERASE FEATURE ////////////////////
  /**
   * @description Toggles erase tool
   * @param {boolean} toolState
   */
  function toggleEraseTool(toolState) {
    const toggleMethod = (toolState) ? 'on' : 'off';
    pixelCanvas[toggleMethod]('mousedown', 'td', startPaintingHandler);
    pixelCanvas[toggleMethod]('mouseenter mouseleave', 'td', erasePreviewHandler);
    pixelCanvas[toggleMethod]('actionStart', 'td', toggleErasePreviewHandler);
    pixelCanvas[toggleMethod]('actionStop', toggleErasePreviewHandler);
  }

  /**
   * @description Toggles erase preview
   */
  function toggleErasePreviewHandler(event) {
    if (event.type === 'actionStart') {
      pixelCanvas.off('mouseenter mouseleave', 'td', erasePreviewHandler);
      $(this).css({
        'opacity': 1
      });
    } else if (event.type === 'actionStop') {
      pixelCanvas.on('mouseenter mouseleave', 'td', erasePreviewHandler);
    }
  }

  /**
   * @description Turns on erase preview
   * @param {object} event
   */
  function erasePreviewHandler(event){
    const currentColor = rgb2hex($(event.target).css('background-color'));
    if (currentColor !== backgroundColor) {
      const opacity = (event.type === 'mouseenter') ? 0.5 : 1;
      $(this).css({
        'opacity': opacity
      });
    }
  }



  //////////////////// SHAPES FEATURE ////////////////////
   /**
   * @description Toggles shape tool
   * @param {boolean} toolState
   */
  function toggleShapeTool(toolState) {
    const toggleMethod = (toolState) ? 'on' : 'off';
    pixelCanvas[toggleMethod]('mousedown', 'td', startDrawingShapeHandler);
  }

  /**
   * @description starts drawing shape
   * @param {object} event
   */
  function startDrawingShapeHandler(event) {
    event.preventDefault();
    const newColor = mainColor;
    const startCell = $(event.target);
    const cellMemory = [];

    pixelCanvas.on('mouseenter', 'td', drawShapeHandler);

    /**
     * @description draws shape and show shape preview
     * @param {object} event
     */
    function drawShapeHandler(event){
      event.preventDefault();

      if(cellMemory.length>0){
        cellMemory.forEach(function(cell, index){
          cellPainter(cell.cell, cell.oldBackground);
        });
        cellMemory.length = 0;
      }

      // Chooses proper method to determine shape cells
      switch(currentTool) {
        case 'circle':
          cells = determineCircle(startCell, $(this));
          break;
        case 'rectangle':
          cells = determineRectangle(startCell, $(this));
          break;
        case 'line':
          cells = determineLine(startCell, $(this));
          break;
        default:
          null;
      }

      cells.forEach(function (cell, index) {
        const cellData = {
          cell: cell,
          oldBackground: cell.css('background-color'),
        };
        cellMemory.push(cellData);
        cellPainter(cell, newColor);
      });
    }

    // Stops drawing line on mouseup event
    $('body').one('mouseup', function stopDrawingShapeHandler(event) {
      event.preventDefault();
      cellMemory.forEach(function(cell){
        // Registering mechanism saves cell background as old color
        // so here is temporary reverting of old background for registering feature
        cellPainter(cell.cell, cell.oldBackground);
        cell.cell.trigger('register', [newColor]);
        cellPainter(cell.cell, newColor);
      });
      pixelCanvas.off('mouseenter', 'td', drawShapeHandler);
      pixelCanvas.trigger('actionStop', [currentTool]);
    });
  }

  /**
   * @description determines cells to draw a line (Bresenham algorithm)
   * @param {object} startCell
   * @param {object} endCell
   * @return {array}
   */
  function determineLine(startCell, endCell) {
    const cellArray = [];
    let x1 = Number(startCell.attr('data-x'))-1;
    let y1 = Number(startCell.attr('data-y'))-1;
    const x2 = Number(endCell.attr('data-x'))-1;
    const y2 = Number(endCell.attr('data-y'))-1;
    const deltaX = Math.abs(x1-x2);
    const deltaY = Math.abs(y1-y2);
    const stepX = (x1 < x2) ? 1 : -1;
    const stepY = (y1 < y2) ? 1 : -1;
    let error; //decision parameter

    cellArray.push(startCell);

    if (deltaX <= deltaY) {
      error = deltaY/2;
      for (let i=0; i<deltaY; i++) {
        y1 += stepY;
        error -= deltaX;
        if (error < 0) {
          x1 += stepX;
          error += deltaY;
        }
        cellArray.push(cellFromCoords(x1, y1));
      }

    } else {
      error = deltaX/2;
      for (let i=0; i<deltaX; i++) {
        x1 += stepX;
        error -= deltaY;
        if (error < 0) {
          y1 += stepY;
          error += deltaX;
        }
        cellArray.push(cellFromCoords(x1, y1));
      }
    }

    return uniqueNotNullArray(cellArray);
  }

  /**
   * @description determines cells to draw a circle (Bresenham algorithm)
   * @param {object} centerCell
   * @param {object} pointCell
   * @returns {array}
   */
  function determineCircle(centerCell, pointCell) {
    const cellArray = [];
    const xC = Number(centerCell.attr('data-x'))-1;
    const yC = Number(centerCell.attr('data-y'))-1;
    const xP = Number(pointCell.attr('data-x'))-1;
    const yP = Number(pointCell.attr('data-y'))-1;

    const r = Math.round(Math.sqrt(Math.pow((xP-xC),2)+Math.pow((yP-yC),2)));
    let x = 0;
    let y = r;
    let e = 0;
    let e1, e2;

    while (x <= y) {
      cellArray.push(cellFromCoords( (x+xC), (y+yC) ));
      cellArray.push(cellFromCoords( (y+xC), ((-1*x)+yC) ));
      cellArray.push(cellFromCoords( ((-1*x)+xC), ((-1*y)+yC) ));
      cellArray.push(cellFromCoords( ((-1*y)+xC), (x+yC) ));
      cellArray.push(cellFromCoords( (y+xC), (x+yC) ));
      cellArray.push(cellFromCoords( (x+xC), ((-1*y)+yC) ));
      cellArray.push(cellFromCoords( ((-1*y)+xC), ((-1*x)+yC) ));
      cellArray.push(cellFromCoords( ((-1*x)+xC), (y+yC) ));
      e1 = e + 2*x +1;
      e2 = e1 -2*y +1;
      x = x+1;
      if (e1 + e2 < 0) {
        e = e1
      } else {
        y = y - 1;
        e = e2;
      }
    }

    return uniqueNotNullArray(cellArray);
  }

  /**
   * @description determines cells to draw a rectangle
   * @param {object} startCell
   * @param {object} endCell
   * @returns {array}
   */
  function determineRectangle(startCell, endCell) {
    const cellsArray = [];
    // calculate array indexes from coords
    const x1 = Number(startCell.attr('data-x'))-1;
    const y1 = Number(startCell.attr('data-y'))-1;
    const x2 = Number(endCell.attr('data-x'))-1;
    const y2 = Number(endCell.attr('data-y'))-1;

    const deltaX = x1-x2;
    const deltaY = y1-y2;

    cellsArray.push(cellCollection[y1][x1]);
    cellsArray.push(cellCollection[y2][x1]);
    for (let i=1; i<=Math.abs(deltaX); i++) {
      if (deltaX<0) {
        cellsArray.push(cellCollection[y1][x1+i]);
        cellsArray.push(cellCollection[y2][x1+i]);
      } else {
        cellsArray.push(cellCollection[y1][x1-i]);
        cellsArray.push(cellCollection[y2][x1-i]);
      }
    }

    for (let i=1; i<Math.abs(deltaY); i++){
      if (deltaY<0) {
        cellsArray.push(cellCollection[y1+i][x1]);
        cellsArray.push(cellCollection[y1+i][x2]);
      } else {
        cellsArray.push(cellCollection[y1-i][x1]);
        cellsArray.push(cellCollection[y1-i][x2]);
      }
    }
 	  return uniqueNotNullArray(cellsArray);
  }

  /**
   * @description Finds cell from coordinates
   * @param {number} x
   * @param {number} y
   * @return {object}
   */
  function cellFromCoords(x, y) {
    let cell = null;
    if (cellCollection[y] && cellCollection[y][x]) {
      cell = cellCollection[y][x];
    }
    return cell;
  }



  //////////////////// EYEDROPPER FEATURE ////////////////////
  /**
   * @description Toggles eyedropper tool
   * @param {object} toolState
   */
  function toggleEyedropperTool(toolState) {
    const toggleMethod = (toolState) ? 'on' : 'off';
    pixelCanvas[toggleMethod]('click', 'td', getColorHandler);
  }

  /**
   * @description Gets color from a cell
   * @param {object} event
   */
  function getColorHandler(event) {
    const gottenColor = $(event.target).css('background-color');
    mainColorPicker.val(rgb2hex(gottenColor));
    mainColor = gottenColor;
  }



  //////////////////// STATUS BAR FEATURES ////////////////////
  // Displays hoovered cell position
  pixelCanvas.on('mouseover', 'td', function getCellPosition() {
    const xCoord = $(this).attr('data-x');
    const yCoord = $(this).attr('data-y');
    $('#coordinates').html('X: ' + xCoord + ' Y: ' + yCoord);
  });



  //////////////////// HELPERS ////////////////////
  /**
   * @description Converts rgb color to hex color
   * @param {string} rgb - rgb color
   * @return {string}
   * Source: taken from https://jsfiddle.net/Mottie/xcqpF/1/light/
   */
  function rgb2hex(rgb) {
    const rgbValues = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
    return (rgb && rgbValues.length === 4) ? '#' +
      ('0' + parseInt(rgbValues[1], 10).toString(16)).slice(-2) +
      ('0' + parseInt(rgbValues[2], 10).toString(16)).slice(-2) +
      ('0' + parseInt(rgbValues[3], 10).toString(16)).slice(-2) : '';
  }

  /**
   * @description Returns array with unique elements
   * @param {array} array
   * @return {array}
   */
  function uniqueNotNullArray(array) {
    const uniqueArray = [];
    array.forEach(function(element) {
      if (element !== null && !uniqueArray.includes(element)) {
        uniqueArray.push(element);
      }
    });
    return uniqueArray;
  }

  /**
   * @description Turns on custom scrollbars
   * Source: jQuery custom content scroller from http://manos.malihu.gr/jquery-custom-content-scroller/
   */
  function turnOnScrollbars(){
    artboard.mCustomScrollbar({
      axis:'xy',
      theme: 'light-3',
      scrollbarPosition: 'outside'
    });
  }
}

// TODO wand (the same tool)
// TODO wand (all the same tool)
// TODO colors history
// TODO change table, tr, td to divs
// TODO RWD