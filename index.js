// 自调用函数，用来初始化事件
;(function init() {
    const fillDataBtn = document.querySelector('#fillData')
    const exportPdfBtn = document.querySelector('#exportPdf')

    fillDataBtn.addEventListener('click', fillDataHandler)
    exportPdfBtn.addEventListener('click', exportPDFHandler)
})()

// 填充数据
function fillDataHandler() {
    // 给表格1插入20条数据
    const table1 = document.querySelector('#table1')
    const table1Str = Array(20)
        .fill(null)
        .map((_, i) => {
            return `
        <tr>
            <td>${i + 1}</td>
            <td>1000000000${i}</td>
            <td>R5 7500F</td>
            <td>PCS</td>
            <td>${i}</td>
            <td>${(Math.random() * 1000).toFixed(4)}</td>
        </tr>
        `
        })
        .join('')
    table1.innerHTML = table1Str

    // 给表格2插入40条数据
    const table2 = document.querySelector('#table2')
    const table2Str = Array(40)
        .fill(null)
        .map((_, i) => {
            return `
        <tr>
            <td>${i + 1}</td>
            <td>1000000000${i}</td>
            <td>R5 7500F</td>
            <td>PCS</td>
            <td>${i}</td>
            <td>${(Math.random() * 1000).toFixed(4)}</td>
        </tr>
        `
        })
        .join('')
    table2.innerHTML = table2Str

    // 给表格三插入内容
    const table3 = document.querySelector('#table3')
    const table3Str = Array(4)
        .fill(null)
        .map((_, i) => {
            return `
           <tr>
                <td width="50">${i + 1}</td>
                <td colspan="5">
                <img class="img" src="./demo.jpeg" />
                </td>
           </tr>
        `
        })
        .join('')
    table3.innerHTML = table3Str
}

// 导出PDF
function exportPDFHandler() {
    const page = document.querySelector('#main')
    getPDF(page, '测试导出')
}

/**
 * 导出PDF方法
 * @param {*} html 要导出的html页面
 * @param {*} title 导出标题
 */
function getPDF(html, title) {
    html2canvas(html, {
        allowTaint: true,
        useCORS: true,
        scale: 2, // 将分辨率提高到特定的DPI 提高2倍
        background: '#FFFFFF',
    }).then(canvas => {
        // 原始dom转化的canvas高度
        let originHeight = canvas.height
        // 每张pdf应该从哪个点开始从原始canvas中截取的点，通过计算像素点去算
        let pagePosition = 0
        let a4Width = 190
        let a4Height = 277 //A4大小，210mmx297mm，四边各保留10mm的边距，显示区域190x277 //一页pdf显示html页面生成的canvas高度;
        // 按照比例计算出当前A4纸应该截取的canvas高度，因为比例是一样的，A4的宽比上canvas的宽等于A4的高比上canvas的高
        // 因为canvas的单位和jsPDF所需要的单位是不一样的，需要进行比例转换
        let onePageHeight = Math.floor((canvas.width / a4Width) * a4Height) //pdf页面偏移
        // 记录生成多少页
        let pageIndex = 0
        const options = {
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
            putOnlyUsedFonts: true,
            floatPrecision: 16, // or "smart", default is 16
        }
        let pdf = new jspdf.jsPDF(options) //A4纸，纵向
        pdf.setDisplayMode('fullwidth', 'continuous', 'FullScreen')
        // 如果内容不超过一页高度，那么直接打印一页即可
        if (originHeight < onePageHeight) {
            // 这里记得要算比例
            pdf.addImage(
                canvas.toDataURL('image/jpeg', 1.0),
                'JPEG',
                10,
                10,
                a4Width,
                (a4Width / canvas.width) * originHeight
            )
            pdf.save(title + '.pdf')
        } else {
            createPage()
        }
        // 递归函数，超过一页将走这里
        function createPage() {
            pageIndex++
            // 如果原始canvas的高度已经被分割完了，直接退出
            if (originHeight.length <= 0) {
                return
            }
            // 创建一个canvas用于分次截图
            const newCanvas = document.createElement('canvas')
            const newCtx = newCanvas.getContext('2d')
            // 截取的宽度不影响计算，直接使用原canvas的宽度即可
            newCanvas.width = canvas.width
            // 通过计算获取真实应该切割的高度
            const realHeight = getCutLineHeight(canvas, onePageHeight, pagePosition)
            if (realHeight > 0) {
                // 得出来的高度不能直接使用到新的canvas中，还需要减去已经绘制了的高度才是当前块要绘制的高度
                newCanvas.height = realHeight
                // 绘制canvas的时候使用canvas对应的真实高度
                // tips：核心就在这里，每次创建的新canvas实际是根据不同的计算位置去原本的canvas中将合适部分截取出来，这样就达到了分页展示的目的
                newCtx.drawImage(
                    canvas,
                    0,
                    pagePosition,
                    canvas.width,
                    realHeight,
                    0,
                    0,
                    canvas.width,
                    realHeight
                )
                // 但是转换成pdf时就需要将真实高度转换成pdf的单位，利用比例算出高度
                // 注意canvas的单位和jsPDF的单位不一致，要转换一下
                pdf.addImage(
                    newCanvas.toDataURL('image/jpeg', 1.0),
                    'JPEG',
                    10,
                    10,
                    a4Width,
                    (a4Width / canvas.width) * realHeight
                )
            }
            // 分到最后的一份的时候会多出一个空白页，所以需要删除
            if (realHeight === 0) {
                // 这个pageIndex会记录页数，刚好最后一页就是空白的，删除即可，注意索引问题
                pdf.deletePage(pageIndex)
            }
            // 记录这个每次计算的页高度，每次截取一段真实高度之后要记录起来，用于算下下一章的真实高度
            pagePosition += realHeight
            // 减少原始canvas高度，代表被截取了
            originHeight -= realHeight
            // 如果原始canvas还是有高度，那么递归深入
            if (realHeight > 0 && originHeight > 0) {
                // 先添加一页空白pdf
                pdf.addPage()
                // 再进行下一页的判断
                createPage()
            } else {
                pdf.save(title + '.pdf')
            }
        }
    })
}

/**
 * 判断传入的那一条线的颜色是否是纯黑色
 * 这里因为我的例子是表格，所以最佳的切割位置是表格的边框线上，所以我才判断纯黑色切割，但是因为偏差问题，就算肉眼看到是存黑的，也会存在其他杂色
 * 所以需要增加误差判断，例如我这里的1000就是误差，允许里面有1000个杂色像素，其余都是黑色像素
 * @param {*} data 传入的是一个canvas的getImageData返回的颜色数组，这个data是一个类数组，需要转换一下，同时这个是颜色大数组，4个为一组代表一个颜色，所以要先分组
 * @returns
 */
function computedRGBIsPureDark(data) {
    const temp = JSON.parse(JSON.stringify(Array.from(data)))
    // 先分组，4个一组，分别代表rgba
    const _data = groupArray(temp)
    // 先针对原数组删除头尾两个颜色点，这个似乎是表格带的，不需要
    _data.splice(0, 2) // 删除头两个元素
    _data.splice(-2, 2) // 删除尾两个元素
    const pureDraks = []
    _data.forEach(item => {
        const r = item[0]
        const g = item[1]
        const b = item[2]
        const a = item[3]
        if (r === 0 && g === 0 && b === 0 && a === 255) {
            pureDraks.push(item)
        }
    })
    // 允许一定的误差存在，因为不一定是完全纯黑的，哪怕视线上是黑的，也可能是灰色的
    if (pureDraks.length > _data.length - 1000) {
        return true
    } else {
        return false
    }
}

// 数组分组函数，每四个一组
function groupArray(array) {
    let groups = []
    for (let i = 0; i < array.length; i += 4) {
        groups.push(array.slice(i, i + 4))
    }
    return groups
}

/**
 * 计算真实应该在原本的canvas上切割的高度
 * @param {*} canvas 要检索的canvas对象
 * @param {*} onePageHeight 一页的高度，这里是A4纸高度
 * @param {*} pagePosition 已经计算好的当前页的前面所有页的高度总和，例如如果当前检索的是第三张，那么这个就是前两张的高度
 * @returns
 */
function getCutLineHeight(canvas, onePageHeight, pagePosition) {
    const ctx = canvas.getContext('2d')
    // 获取这个位置的一行像素
    let position = onePageHeight + pagePosition
    const realHeight = recursionLineColor(position)

    // 要减去已经渲染到界面的那部分高度，得到的就是真实当前张应该渲染的高度
    return realHeight - pagePosition

    // 递归退减函数，向上逐个像素判断
    function recursionLineColor(h) {
        // 这里就是取1px高，一个canvas宽的一条线的像素，拿出来校验，是否刚好落在表格的边框上
        const lineGrb = ctx.getImageData(0, h, canvas.width, 1)
        // 判断这行是否是纯黑色，如果是那么代表这个位置可以被切断，否则递归减少一个像素，继续判断直至找到一行纯黑色为止
        if (!computedRGBIsPureDark(lineGrb.data)) {
            // 否则位置上移一个，继续递归
            position -= 1
            return recursionLineColor(position)
        } else {
            // 找到了目标就返回当前计算的高度，注意这个高度是相对于整个原始canvas的，意味着如果是判断的第二张，此时里面包含了第一张的高度
            return h
        }
    }
}
