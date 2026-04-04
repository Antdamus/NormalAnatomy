
  const FILE_PREFIX = "diverticulitis"; // <-- change per document
  const INCLUDE = "2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22"
; // "all" OR "2,4,5,8"
  const CASE_MAP = [[3,4],[5,6],[7,8],[9,10],[13,14,15,16],[17,18,19,20,21]]; // e.g. [[2,5],[8,9]] ; leave [] for auto-solo everything
  const CORE_GAP = false; // <-- true = Pathway B (Core GAP), false = Pathway A (Core covered)
  const CORE_SECTION = "GI"; // <-- edit (ignored if CORE_GAP=true)
  const CORE_PAGES = "pp. 218-219"; // <-- edit (ignored if CORE_GAP=true)

/************************************ */

  const FILE_PREFIX = "pancreatitisandcomplications"; // <-- change per document
  const INCLUDE = "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40"
; // "all" OR "2,4,5,8"
  const CASE_MAP = [[9,10,],[11,12],[13,14,15],[21,22],[27,28],[33,34],[35,36],[37,38],[39,40]]; // e.g. [[2,5],[8,9]] ; leave [] for auto-solo everything
  const CORE_GAP = false; // <-- true = Pathway B (Core GAP), false = Pathway A (Core covered)
  const CORE_SECTION = "GI"; // <-- edit (ignored if CORE_GAP=true)
  const CORE_PAGES = "pp. 150-153"; // <-- edit (ignored if CORE_GAP=true)

  /********************** */

   const FILE_PREFIX = "hepatocellularCarcinoma"; // <-- change per document
  const INCLUDE = "3,4,5,6,7,8,9,10,11,12,14,15,16,17,18,19,20,21,22,23,24,25"
; // "all" OR "2,4,5,8"
  const CASE_MAP = [[6,7],[8,9],[10,11],[14,15,16,17,18,19],[22,23]]; // e.g. [[2,5],[8,9]] ; leave [] for auto-solo everything
  const CORE_GAP = false; // <-- true = Pathway B (Core GAP), false = Pathway A (Core covered)
  const CORE_SECTION = "in this case the core talks about it but in different sections, you will have to peruse thorugh it"; // <-- edit (ignored if CORE_GAP=true)
  const CORE_PAGES = "it is all over the place"; // <-- edit (ignored if CORE_GAP=true)

  /********************** */

  const FILE_PREFIX = "PancreaticDuctalCarcinoma"; // <-- change per document
  const INCLUDE = [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28]; // "all" OR "2,4,5,8"
  const CASE_MAP = [[5,6],[15,16],[17,18],[19,20],[21,22],[23,24],[25,26],[27,28]]; // e.g. [[2,5],[8,9]] ; leave [] for auto-solo everything
  const CORE_GAP = false; // <-- true = Pathway B (Core GAP), false = Pathway A (Core covered)
  const CORE_SECTION = "only found a mention in page 155"; // <-- edit (ignored if CORE_GAP=true)
  const CORE_PAGES = ""; // <-- edit (ignored if CORE_GAP=true)

  /********************** */

  const FILE_PREFIX = "AcuteCalculusCholecystitis"; // <-- change per document
  const INCLUDE = [1,2,3,4,5,6,7,8,9,10]; // "all" OR "2,4,5,8"
  const CASE_MAP = []; // e.g. [[2,5],[8,9]] ; leave [] for auto-solo everything
  const CORE_GAP = false; // <-- true = Pathway B (Core GAP), false = Pathway A (Core covered)
  const CORE_SECTION = "It is found in mulitple regions of the book so you are going to have to look through it"; // <-- edit (ignored if CORE_GAP=true)
  const CORE_PAGES = ""; // <-- edit (ignored if CORE_GAP=true)

  /********************** */

  const FILE_PREFIX = "Cirrhosis"; // <-- change per document
  const INCLUDE = [2,3,4,5,6,7,8,9]; // "all" OR "2,4,5,8"
  const CASE_MAP = [[6,7]]; // e.g. [[2,5],[8,9]] ; leave [] for auto-solo everything
  const CORE_GAP = false; // <-- true = Pathway B (Core GAP), false = Pathway A (Core covered)
  const CORE_SECTION = "it might be in mulitple regions of the book so you are going to have to look through it"; // <-- edit (ignored if CORE_GAP=true)
  const CORE_PAGES = ""; // <-- edit (ignored if CORE_GAP=true)


  /********************** */

  const FILE_PREFIX = "HepaticMetastasesandLymphoma"; // <-- change per document
  const INCLUDE = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]; // "all" OR "2,4,5,8"
  const CASE_MAP = [[1,2],[3,4],[7,8],[9,10],[11,12],[13,14],[15,16],[17,18],[19,20],[21,22],[25,26],[29,30,31,32,33]]; // e.g. [[2,5],[8,9]] ; leave [] for auto-solo everything
  const CORE_GAP = false; // <-- true = Pathway B (Core GAP), false = Pathway A (Core covered)
  const CORE_SECTION = "it might be in mulitple regions of the book so you are going to have to look through it"; // <-- edit (ignored if CORE_GAP=true)
  const CORE_PAGES = ""; // <-- edit (ignored if CORE_GAP=true)

  /********************** */

    const FILE_PREFIX = "USacuteCholecystitis"; // <-- change per document
  const INCLUDE = [2,3,4,5,6,7,8,9,10]; // "all" OR "2,4,5,8"
  const CASE_MAP = [[5,6],[7,8]]; // e.g. [[2,5],[8,9]] ; leave [] for auto-solo everything
  const CORE_GAP = false; // <-- true = Pathway B (Core GAP), false = Pathway A (Core covered)
  const CORE_SECTION = "it might be in mulitple regions of the book so you are going to have to look through it"; // <-- edit (ignored if CORE_GAP=true)

  /********************** */

    const FILE_PREFIX = "UScholelithiasis"; // <-- change per document
  const INCLUDE = [2,3,4,5,6,7,8,9,10,11,12]; // "all" OR "2,4,5,8"
  const CASE_MAP = [[5,6],[9,10]]; // e.g. [[2,5],[8,9]] ; leave [] for auto-solo everything
  const CORE_GAP = false; // <-- true = Pathway B (Core GAP), false = Pathway A (Core covered)
  const CORE_SECTION = "it might be in mulitple regions of the book so you are going to have to look through it"; // <-- edit (ignored if CORE_GAP=true)
  const CORE_PAGES = ""; // <-- edit (ignored if CORE_GAP=true)

/********************** */

    const FILE_PREFIX = "UShydronephrosis"; // <-- change per document
  const INCLUDE = [1,2,3,4,5,6,7,8,9,10]; // "all" OR "2,4,5,8"
  const CASE_MAP = [[5,6],[7,8]]; // e.g. [[2,5],[8,9]] ; leave [] for auto-solo everything
  const CORE_GAP = false; // <-- true = Pathway B (Core GAP), false = Pathway A (Core covered)
  const CORE_SECTION = "it might be in mulitple regions of the book so you are going to have to look through it"; // <-- edit (ignored if CORE_GAP=true)
  const CORE_PAGES = ""; // <-- edit (ignored if CORE_GAP=true)

  /********************** */

    const FILE_PREFIX = "USDVT"; // <-- change per document
  const INCLUDE = [1,2,3,4,5,6,7,8,9,10]; // "all" OR "2,4,5,8"
  const CASE_MAP = []; // e.g. [[2,5],[8,9]] ; leave [] for auto-solo everything
  const CORE_GAP = false; // <-- true = Pathway B (Core GAP), false = Pathway A (Core covered)
  const CORE_SECTION = "it might be in mulitple regions of the book so you are going to have to look through it"; // <-- edit (ignored if CORE_GAP=true)
  const CORE_PAGES = ""; // <-- edit (ignored if CORE_GAP=true)

  /********************** */

    const FILE_PREFIX = "USCholedecholithiasis"; // <-- change per document
  const INCLUDE = [2,3,4]; // "all" OR "2,4,5,8"
  const CASE_MAP = [[2,3]]; // e.g. [[2,5],[8,9]] ; leave [] for auto-solo everything
  const CORE_GAP = false; // <-- true = Pathway B (Core GAP), false = Pathway A (Core covered)
  const CORE_SECTION = "it might be in mulitple regions of the book so you are going to have to look through it"; // <-- edit (ignored if CORE_GAP=true)
  const CORE_PAGES = ""; // <-- edit (ignored if CORE_GAP=true)

  /********************** */

  const FILE_PREFIX = "USbiliaryductaldilation"; // <-- change per document
  const INCLUDE = [2,3,4]; // "all" OR "2,4,5,8"
  const CASE_MAP = []; // e.g. [[2,5],[8,9]] ; leave [] for auto-solo everything
  const CORE_GAP = false; // <-- true = Pathway B (Core GAP), false = Pathway A (Core covered)
  const CORE_SECTION = "it might be in mulitple regions of the book so you are going to have to look through it"; // <-- edit (ignored if CORE_GAP=true)
  const CORE_PAGES = ""; // <-- edit (ignored if CORE_GAP=true)

  /********************** */
    const FILE_PREFIX = "USPancreas"; // <-- change per document
  const INCLUDE = [1,2,3,4]; // "all" OR "2,4,5,8"
  const CASE_MAP = []; // e.g. [[2,5],[8,9]] ; leave [] for auto-solo everything
  const CORE_GAP = false; // <-- true = Pathway B (Core GAP), false = Pathway A (Core covered)
  const CORE_SECTION = "it might be in mulitple regions of the book so you are going to have to look through it"; // <-- edit (ignored if CORE_GAP=true)
  const CORE_PAGES = ""; // <-- edit (ignored if CORE_GAP=true)

  /********************** */
    const FILE_PREFIX = "USUrolithiasis"; // <-- change per document
  const INCLUDE = [1,2,3,4]; // "all" OR "2,4,5,8"
  const CASE_MAP = [[3,4]]; // e.g. [[2,5],[8,9]] ; leave [] for auto-solo everything
  const CORE_GAP = false; // <-- true = Pathway B (Core GAP), false = Pathway A (Core covered)
  const CORE_SECTION = "it might be in mulitple regions of the book so you are going to have to look through it"; // <-- edit (ignored if CORE_GAP=true)
  const CORE_PAGES = ""; // <-- edit (ignored if CORE_GAP=true)

  /********************** */

    const FILE_PREFIX = "USCirrhosis"; // <-- change per document
  const INCLUDE = [2,3,4,5,6,7,8,9,10]; // "all" OR "2,4,5,8"
  const CASE_MAP = [[]]; // e.g. [[2,5],[8,9]] ; leave [] for auto-solo everything
  const CORE_GAP = false; // <-- true = Pathway B (Core GAP), false = Pathway A (Core covered)
  const CORE_SECTION = "it might be in mulitple regions of the book so you are going to have to look through it"; // <-- edit (ignored if CORE_GAP=true)
  const CORE_PAGES = ""; // <-- edit (ignored if CORE_GAP=true)

  /********************** */

    const FILE_PREFIX = "USPortalHypertension"; // <-- change per document
  const INCLUDE = [2,3,4,5,6,7,8,9,10]; // "all" OR "2,4,5,8"
  const CASE_MAP = [[9,10]]; // e.g. [[2,5],[8,9]] ; leave [] for auto-solo everything
  const CORE_GAP = false; // <-- true = Pathway B (Core GAP), false = Pathway A (Core covered)
  const CORE_SECTION = "it might be in mulitple regions of the book so you are going to have to look through it"; // <-- edit (ignored if CORE_GAP=true)
  const CORE_PAGES = ""; // <-- edit (ignored if CORE_GAP=true)

  /********************** */

  const FILE_PREFIX = "USPortalVeinOcclusion"; // <-- change per document
  const INCLUDE = [1,2,3,4]; // "all" OR "2,4,5,8"
  const CASE_MAP = [[]]; // e.g. [[2,5],[8,9]] ; leave [] for auto-solo everything
  const CORE_GAP = false; // <-- true = Pathway B (Core GAP), false = Pathway A (Core covered)
  const CORE_SECTION = "it might be in mulitple regions of the book so you are going to have to look through it"; // <-- edit (ignored if CORE_GAP=true)
  const CORE_PAGES = ""; // <-- edit (ignored if CORE_GAP=true)

  /********************** */

  const FILE_PREFIX = "USHepatocellularCarcinoma"; // <-- change per document
  const INCLUDE = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22]; // "all" OR "2,4,5,8"
  const CASE_MAP = [[3,4],[5,6],[7,8],[13,14],[17,18],[19,20],[21,22]]; // e.g. [[2,5],[8,9]] ; leave [] for auto-solo everything
  const CORE_GAP = false; // <-- true = Pathway B (Core GAP), false = Pathway A (Core covered)
  const CORE_SECTION = "it might be in mulitple regions of the book so you are going to have to look through it"; // <-- edit (ignored if CORE_GAP=true)
  const CORE_PAGES = ""; // <-- edit (ignored if CORE_GAP=true)

  /********************** */
  const FILE_PREFIX = "KidneyRCC"; // <-- change per document
  const INCLUDE = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18]; // "all" OR "2,4,5,8"
  const CASE_MAP = [[5,6],[7,8],[9,10,11,12],[13,14],[15,16]]; // e.g. [[2,5],[8,9]] ; leave [] for auto-solo everything

  /********************** */
const FILE_PREFIX = "RenalTransitionalCellCarcinoma";
const INCLUDE = [1,2,3,4,5,6,7,8,9,10];
const CASE_MAP = [[2,3],[5,6],[7,8]];

/********************** */
const FILE_PREFIX = "RenalCyst";
const INCLUDE = [1,2,3,4,5,6,7,8,9,10];
const CASE_MAP = [[3,4],[7,8]];

/********************** */
const FILE_PREFIX = "RenalPelvicCyst";
const INCLUDE = [1,2,3,4];
const CASE_MAP = [[1,2]];

/********************** */
const FILE_PREFIX = "RenalMetastasis";
const INCLUDE = [1,2,3,4];
const CASE_MAP = [[1,2],[3,4]];

