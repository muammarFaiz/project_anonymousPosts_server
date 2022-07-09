const formPageArr = (totalPages, pagePerGroup, ondemandPage) => {
  let groupArrayOfPages = []
  if (totalPages <= pagePerGroup) {
    for (let i = 0; i < totalPages; i++) {
      groupArrayOfPages.push(i + 1)
    }
  } else {
    const maxPageInGroup = pagePerGroup + 1
    const pagesExcludingFirstGroup = totalPages - pagePerGroup
    const remainder = pagesExcludingFirstGroup % maxPageInGroup
    const groupsWith11Pages = (pagesExcludingFirstGroup - remainder) / maxPageInGroup
    let theLastPageWithMaxGroup
    if(groupsWith11Pages < 1) {
      theLastPageWithMaxGroup = pagePerGroup
    } else {
      theLastPageWithMaxGroup = pagePerGroup + (groupsWith11Pages * maxPageInGroup)
    }
    if(ondemandPage > theLastPageWithMaxGroup) {
      for (let i = theLastPageWithMaxGroup; i <= theLastPageWithMaxGroup + remainder; i++) {
        groupArrayOfPages.push(i)
      }
    } else if(ondemandPage <= pagePerGroup) {
      for (let i = 1; i <= pagePerGroup; i++) {
        groupArrayOfPages.push(i)
      }
    } else {
      // total group with 11 pages below the ondemandPage
      const totalGroupWith11Pages = Math.ceil((ondemandPage - pagePerGroup) / maxPageInGroup)
      const startInNumber = pagePerGroup + ((totalGroupWith11Pages - 1) * maxPageInGroup)
      for (let i = startInNumber; i < maxPageInGroup; i++) {
        groupArrayOfPages.push(i)
      }
    }
    // what is the initial page number of this group?
    // the first group must only have 10 pages
  }
  return groupArrayOfPages
}

module.exports = formPageArr