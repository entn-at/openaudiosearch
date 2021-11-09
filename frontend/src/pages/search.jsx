import React from 'react'
import { Helmet } from 'react-helmet'
import ReactJson from 'react-json-view'
import { DataSearch, MultiList, DateRange, ReactiveBase, ReactiveList, SelectedFilters, MultiRange, DynamicRangeSlider } from '@appbaseio/reactivesearch'
import { Heading, Flex, Box, Spinner, Button, Text, chakra, IconButton, Input, InputGroup, InputLeftElement } from '@chakra-ui/react'
import { useParams, Link, useHistory, useLocation } from 'react-router-dom'
import Moment from 'moment'
import { useTranslation } from 'react-i18next'
import { CgClose } from 'react-icons/cg'
import { FaFilter, FaChevronDown, FaChevronRight, FaSearch } from 'react-icons/fa'
import { MdChildFriendly, MdRemoveCircleOutline } from 'react-icons/md'

import { API_ENDPOINT } from '../lib/config'
import { stripHTML } from '../lib/sanitize'
import { PostButtons } from './post'
import { TranscriptSnippet } from '../comp/transcript'
import { useIsAdmin } from '../hooks/use-login'
import { reactiveBaseTheme } from '../theme'

const { ResultListWrapper } = ReactiveList


// A simple component that displays a search box. All props are passed through
// to the input element.
export function SearchInput (props = {}) {
  return (
    <InputGroup>
      <InputLeftElement pointerEvents='none' children={<FaSearch />} />
      <Input
        bg='white'
        {...props}
      />
    </InputGroup>
  )
}

// This renders an input element, and on submit forwards to the search page
// with the search word applied.
export function GoToSearchBox (props = {}) {
  const [value, setValue] = React.useState('')
  const history = useHistory()
  function onSubmit (e) {
    e.preventDefault()
    const encoded = encodeURIComponent(value)
    history.push(`/search/?searchbox="${encoded}"`)

  }
  return (
    <Flex as='form' onSubmit={onSubmit}>
      <SearchInput
        bg='white'
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder='Search for community media'
        name='searchbox'
        {...props}
      />
    </Flex>
  )
}

// A custom data search component.
//
// This renders the search box using chakra components. 
// Reactivesearch does not seem to have a reliable way to take over rendering
// regulary, so we do render the DataSearch component but with "display: none",
// so it's hidden completely via CSS. The DataSearch component is then used in
// "controlled" mode, so the query value is forwarded to the datasearch component.
//
// TODO: Find out if reactivesearch really does not have a cleaner way to do this.
export function CustomDataSearch (props = {}) {
  const [queryValue, setQueryValue] = React.useState('')
  const [inputValue, setInputValue] = React.useState('')
  const [storedTriggerQuery, setStoredTriggerQuery] = React.useState(null)

  function onChange (nextQueryValue, triggerQuery, event) {
    if (triggerQuery) setStoredTriggerQuery({ triggerQuery })
    setQueryValue(nextQueryValue)
    setInputValue(nextQueryValue)
  }

  function onSubmit (e) {
    e.preventDefault()
    setQueryValue(inputValue)
  }

  const dataSearchStyle = { display: 'none' }

  return (
    <>
      <Flex as='form' onSubmit={onSubmit} flex={1}>
        <SearchInput
          bg='white'
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder='Search for community media'
        />
      </Flex>
      <DataSearch style={dataSearchStyle} {...props} onChange={onChange} value={queryValue} />
    </>
  )
}

function RemoveFilterButton ({ onClick }) {
  return (
    <IconButton
      variant='ghost'
      rounded
      size='sm'
      title='Remove filter'
      onClick={onClick}
      icon={<MdRemoveCircleOutline />}
    />
  )
}

export default function SearchPage () {
  const [show, setShow] = React.useState(false)
  const toggleMenu = () => setShow(!show)
  const location = useLocation()
  const url = API_ENDPOINT + '/search'
  const facets = ['searchbox', 'genre', 'datePublished', 'publisher', 'creator', 'duration']
  const { t } = useTranslation()
  const history = useHistory()
  const filterButtonOpen =
    <Flex direction='row'>
      <FaFilter />
      <Text ml='10px'>
        {t('showFilter', 'Show Filter')}
      </Text>
    </Flex>
  const filterButtonClose =
    <Flex direction='row'>
      <CgClose />
      <Text ml='10px'>
        {t('hideFilter', 'Hide Filter')}
      </Text>
    </Flex>

  const multilistStyle = { marginBottom: '30px' }

  function customHighlight (props) {
    return {
      highlight: {
        fragment_size: 200,
        number_of_fragments: 2,
        type: "fvh",
        fields: {
          transcript: {},
          headline: {},
          description: {}
        },
        pre_tags: ['<mark>'],
        post_tags: ['</mark>'],
        fields: {
            text: {},
            title: {},
        },
      }
    }
  }

  function renderSelectedFilters (props) {
    const { selectedValues, setValue } = props
    const activeFilters = Object.entries(selectedValues).map(([key, props]) => {
      if (!props.value) return null
      if (Array.isArray(props.value) && !props.value.length) return null
      return { key, ...props }
    }).filter(x => x)

    let main
    let text = ''
    if (!activeFilters.length) {
      text = t('search', 'Search')
      main = <Box mt='4'>{text}</Box>
    } else {
      text = activeFilters.map(filter => Array.isArray(filter.value) ? filter.value.join(', ') : filter.value).join('; ')
      main = (
        <>
          {activeFilters.map((props) => {
            let value
            if (Array.isArray(props.value)) {
              value = (
                <>
                  {props.value.map((value, i) => (
                    <Text key={i}>
                      {value}
                      <RemoveFilterButton
                        onClick={e => setValue(props.key, props.value.filter(v => v !== value))}
                      />
                    </Text>
                  ))}
                </>
              )
            } else {
              value = (
                <Text>
                  {props.value}
                  <RemoveFilterButton
                    onClick={e => setValue(props.key, null)}
                  />
                </Text>
              )
            }
            return (
              <Flex key={props.key} direction='column' display='inline-block' mr='2'>
                <Box fontSize='sm' color='gray.400'>
                  {props.label}
                </Box>
                <Box>
                  {value}
                </Box>
              </Flex>
            )
          })}
        </>
      )
    }

    return (
      <Heading
        size='lg'
        mb='2'
        ml={[null, null, '350px', '350px']}
      >
        <Helmet>
          <title>{text} – Open Audio Search</title>
        </Helmet>
        {main}
      </Heading>
    )
  }

  return (
    <Flex color='white'>
      <ReactiveBase
        getSearchParams={() => location.search}
        theme={reactiveBaseTheme}
        app='oas'
        url={url}
      >
        <Flex direction='column'>
          <SelectedFilters showClearAll render={renderSelectedFilters} />
          <Box
            // w={['90vw', '90vw', '600px', '600px']}
            maxWidth='750px'
            ml={[null, null, '350px', '350px']}
            mt='6'
          >
            <CustomDataSearch
              componentId='searchbox'
              dataField={['headline', 'description', 'transcript']}
              fieldWeights={[5, 1]}
              placeholder={t('searchForm.placeholder', 'Search for radio broadcasts')}
              highlight
              autosuggest={false}
              queryFormat='and'
              fuzziness={1}
              react={{
                and: facets.filter(f => f !== 'searchbox')
              }}
              defaultValue=''
              URLParams={true}
            />
          </Box>

          <Flex direction={['column', 'column', 'row', 'row']} justify-content='flex-start'>
            <Button
              aria-label='FilterMenu'
              // display={{ base: 'flex', md: 'none' }}
              display={['flex', 'flex', 'none', 'none']}
              onClick={toggleMenu}
              // icon={show ? <CgClose /> : <FiMenu />}
              shadow='md'
              mt='20px'
              mb='10px'
            // w={['50px', '50px', null, null]}
            >
              {show ? filterButtonClose : filterButtonOpen}
            </Button>
            <Box
              // display={{ base: show ? 'flex' : 'none', md: 'block' }}
              display={[show ? 'flex' : 'none', show ? 'flex' : 'none', 'block', 'block']}
              // flexBasis={{ base: '100%', md: 'auto' }}
              flexBasis={['100%', '100%', 'auto', 'auto']}
            >
              <Flex
                direction='column'
                w={['250px', '300px', '300px', '300px']}
                mr={[null, null, '50px', '50px']}
                mb={['30px', '30px', null, null]}
              >
                <Box>
                  <MultiList
                    style={multilistStyle}
                    title={t('publisher', 'Publisher')}
                    componentId='publisher'
                    dataField='publisher.keyword'
                    URLParams
                    react={{
                      and: facets.filter(f => f !== 'publisher')
                    }}
                  />
                </Box>
                <Box>
                  <MultiList
                    style={multilistStyle}
                    title={t('creator', 'Creator')}
                    componentId='creator'
                    dataField='creator.keyword'
                    URLParams
                    react={{
                      and: facets.filter(f => f !== 'creator')
                    }}
                  />
                </Box>
                <Box>
                  <MultiList
                    style={multilistStyle}
                    title={t('genre', 'Genre')}
                    componentId='genre'
                    dataField='genre.keyword'
                    URLParams
                    react={{
                      and: facets.filter(f => f !== 'genre')
                    }}
                  />
                </Box>
                <Box>
                  <DateRange
                    style={multilistStyle}
                    componentId='datePublished'
                    dataField='datePublished'
                    title={t('publishingdate', 'Publishing Date')}
                    URLParams
                    customQuery={
                      function (value) {
                        if (!value) return {}

                        return {
                          query: {
                            range: {
                              datePublished: {
                                gte: value.start,
                                lte: value.end,
                                format: 'yyyy-MM-dd'
                              }
                            }
                          }
                        }
                    }
                    }
                    react={{
                      and: facets.filter(f => f !== 'datePublished')
                    }}
                  />
                </Box>
                <Box>
                  <DynamicRangeSlider
                    style={multilistStyle}
                    componentId='duration'
                    dataField='media.duration'
                    nestedField='media'
                    rangeLabels={(min, max) => (
                      {
                        start: (min / 60).toFixed() + ' min',
                        end: (max / 60).toFixed() + ' min'
                      }
                    )}
                    tooltipTrigger='hover'
                    URLParams
                    renderTooltipData={data => (
                      <Text fontSize='sm'>{(data / 60).toFixed()} min</Text>
                    )}
                    react={{
                      and: facets.filter(f => f !== 'duration')
                    }}
                    title='Duration'
                  />
                </Box>
              </Flex>
            </Box>
            <Flex direction='column'>
              <Flex maxWidth='750px'>
                <ReactiveList
                  dataField='dateModified'
                  componentId='SearchResults'
                  pagination
                  sortOptions={[
                    { label: 'Date (desc)', dataField: 'datePublished', sortBy: 'desc' },
                    { label: 'Date (asc)', dataField: 'datePublished', sortBy: 'asc' },
                    { label: 'Duration (desc)', dataField: 'media.duration', sortBy: 'desc' },
                    { label: 'Duration (asc)', dataField: 'media.duration', sortBy: 'asc' }
                  ]}
                  defaultSortOption='Date (desc)'
                  URLParams
                  react={{
                    and: facets
                  }}
                >
                  {({ data, error, loading, ...args }) => {
                    if (loading) return <Spinner size='xl' />
                    return (
                      <ResultListWrapper>
                        {
                          data.map((item, i) => (
                            <ResultItem item={item} key={i} showSnippets search />
                          ))
                        }
                      </ResultListWrapper>
                    )
                  }}
                </ReactiveList>
              </Flex>
            </Flex>
          </Flex>
        </Flex>
      </ReactiveBase>
    </Flex>
  )
}

export function ResultItem (props) {
  const { item, showSnippets, search } = props
  const isAdmin = useIsAdmin()
  const { t } = useTranslation()

  const snippets = (
    <>
      {Object.entries(item.highlight).map(([fieldname, snippets]) => (
        <SnippetList onlyTranscript key={fieldname} fieldname={fieldname} snippets={snippets} post={item} />
      ))}
    </>
  )

  const postId = item.$meta.id

  let duration = null
  if (item.media.length > 0) {
    duration = (item.media[0].duration / 60).toFixed() + ' min'
  }

  const description = React.useMemo(() => stripHTML(item.description), [item.description])

  return (
    <Flex
      direction='column'
      border='1px'
      p='2'
      borderColor='gray.300'
      boxShadow='sm'
      borderRadius='md'
      bg='white'
      mb='2'
      overflow='hidden'
      overflowWrap='break-word'
      wordBreak='break-word'
      w='100%'
    >
      <Flex direction='column' mx='3'>
        <Flex
          direction={['column', 'column', 'row', 'row']}
          justify='space-between'
          my={4}
        >
          <Link to={{
            pathname: '/post/' + postId,
            state: {
              fromSearch: search
            }
          }}
          >
            <Heading size='md'>
              <TextWithMarks>{item.headline}</TextWithMarks>
            </Heading>
          </Link>
          <Flex ml={[null, null, 4, 4]} mb={[1, 1, null, null]} mt={[4, 4, null, null]} align='flex-start' justify='flex-start'>
            <PostButtons post={item} />
          </Flex>
        </Flex>
        <Flex direction='column'>
          <Flex direction='column' justify='space-between'>
            {item.publisher && <Text mr='2' fontSize='sm'>{item.publisher}</Text>}
            <Flex direction='row' justify='space-between'>
              {item.datePublished &&
                <Text mr='2' fontSize='sm'>
                  {Moment(item.datePublished).format('DD.MM.YYYY')}
                </Text>}
              {duration &&
              <Text mr='2' fontSize='sm'>{duration}</Text>}
            </Flex>
          </Flex>
          <Box mt='2'>
            <CollapsedText render={text => <TextWithMarks>{text}</TextWithMarks>}>
              {description}
            </CollapsedText>
          </Box>
        </Flex>
        {showSnippets && snippets && <div>{snippets}</div>}
        {isAdmin && <ReactJson src={item} collapsed name={false} />}
      </Flex>
    </Flex>
  )
}

export function Sanitize (props = {}) {
  const { children } = props
  const sanitized = React.useMemo(() => {
    return stripHTML(children)
  }, [children])
  return sanitized || ''
}

export function TextWithMarks (props = {}) {
  let { children, text, style = {}, markAs, ...rest } = props
  text = text || children
  if (!text) return null
  const markIn = '<mark>'
  const markOut = '</mark>'
  const idxIn = text.indexOf(markIn)
  const idxOut = text.indexOf(markOut)
  if (idxIn === -1 && idxOut === -1) return text
  const before = text.slice(0, idxIn)
  const within = text.slice(idxIn + markIn.length, idxOut)
  const after = text.slice(idxOut + markOut.length)
  // const Comp = props.markAs || chakra.span
  const markStyle = { bg: 'highlightMark' }
  return (
    <Box as='span'>
      {before}
      <Box as='mark' {...markStyle}>
        {within}
      </Box>
      {after}
    </Box>
  )
}

function CollapsedText (props) {
  const { children, render, initialCollapsed = true, characterLength = 280 } = props
  const [collapsed, setCollapsed] = React.useState(initialCollapsed)
  const fullText = children || ''
  const isCollapsible = fullText.length >= characterLength
  const text = React.useMemo(() => {
    if (!collapsed) return fullText
    if (!isCollapsible) return fullText
    const re = new RegExp(`^[\\s\\S]{${characterLength}}\\w*`)
    const matches = fullText.match(re)
    if (matches && matches.length > 0) {
      const slice = fullText.slice(0, matches[0].length)
      return slice + "..."
    }
    return fullText
  })
  const { t } = useTranslation()

  const renderedText = React.useMemo(() => {
    if (!text) return null
    if (!render) return text
    return render(text)
  }, [text, render])

  const buttonCollapse =
    <Flex direction='row'>
      {collapsed ? <Text color='secondary.600'>{t('more', 'More')}</Text> : <Text color='secondary.600'>{t('less', 'Less')}</Text>}
      {collapsed ? <Box ml='5px' mt='1px'><FaChevronRight color='secondary.600' /></Box> : <Box ml='5px' mt='1px'><FaChevronDown color='secondary.600' /></Box>}
    </Flex>

  return (
    <Flex direction = 'column' alignItems='flex-end' justify='space-between'>
    <Text>
      {renderedText}
    </Text>
      {isCollapsible && (
        <Button
          borderRadius='0'
          mt='1'
          variant='link'
          onClick={e => setCollapsed(collapsed => !collapsed)}
        >
          {buttonCollapse}
        </Button>
      )}
    </Flex>
  )
}

export function SnippetList (props = {}) {
  const { fieldname, snippets, post, onlyTranscript } = props
  if (onlyTranscript && fieldname !== 'transcript') return null
  return (
    <Box p={2}>
      {snippets.map((snippet, i) => (
        <Snippet key={i} post={post} fieldname={fieldname} snippet={snippet} />
      ))}
    </Box>
  )
}

function Snippet (props = {}) {
  const { fieldname, snippet, post } = props
  if (fieldname === 'transcript') {
    return (
      <TranscriptSnippet post={post} snippet={snippet} />
    )
  } else {
    return (
      <TextWithMarks>{snippet}</TextWithMarks>
    )
  }
}
