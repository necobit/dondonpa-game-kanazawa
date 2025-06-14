const fs = require('fs');
const path = require('path');
const { generateBulkComments, checkMlxLmAvailability } = require('./mlx-lm-api');

async function generateAndSaveComments() {
  console.log('コメント生成を開始します...');
  
  // MLX-LMの可用性を確認
  const mlxLmAvailable = await checkMlxLmAvailability();
  if (!mlxLmAvailable) {
    console.error('MLX-LMサーバーが利用できません。先にMLX-LMサーバーを起動してください。');
    process.exit(1);
  }
  
  try {
    // 加点コメントを生成
    console.log('\n加点時コメントを生成中...');
    const positiveComments = await generateBulkComments(true, 50);
    console.log(`加点時コメント: ${positiveComments.length}個生成完了`);
    
    // 減点コメントを生成
    console.log('\n減点時コメントを生成中...');
    const negativeComments = await generateBulkComments(false, 50);
    console.log(`減点時コメント: ${negativeComments.length}個生成完了`);
    
    // コメントをJSONファイルに保存
    const commentsData = {
      positive: positiveComments,
      negative: negativeComments,
      generatedAt: new Date().toISOString()
    };
    
    const outputPath = path.join(__dirname, 'game-comments.json');
    fs.writeFileSync(outputPath, JSON.stringify(commentsData, null, 2), 'utf8');
    
    console.log(`\nコメントを ${outputPath} に保存しました。`);
    
    // 生成されたコメントを表示
    console.log('\n=== 生成された加点時コメント ===');
    positiveComments.forEach((comment, index) => {
      console.log(`${index + 1}: ${comment}`);
    });
    
    console.log('\n=== 生成された減点時コメント ===');
    negativeComments.forEach((comment, index) => {
      console.log(`${index + 1}: ${comment}`);
    });
    
  } catch (error) {
    console.error('コメント生成中にエラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプトを実行
generateAndSaveComments();